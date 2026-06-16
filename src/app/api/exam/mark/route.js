import { NextResponse } from "next/server";
import { updateCortexFromExam, emitCortexEvent } from "@/lib/cortex";
import { emitExamCompleted } from "@/lib/events";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examMarkSchema, validateRequestBody } from "@/lib/validation/schemas";
import { logAIUsage } from "@/lib/ai/tracker";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

/* ─────────────────────────────────────────────
   AI CALL PIPELINE (ROBUST FALLBACK CHAIN)
───────────────────────────────────────────── */

async function callAI(prompt, userId) {
  const promptTokens = Math.ceil(prompt.length / 4);

  /* 1. Cloudflare */
  if (process.env.CLOUDFLARE_API_TOKEN) {
    const startTime = Date.now();
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            max_tokens: 3000,
          }),
        }
      );

      const data = await res.json();
      const text = data?.result?.response;
      if (text) {
        const latencyMs = Date.now() - startTime;
        const completionTokens = Math.ceil(text.length / 4);
        
        await logAIUsage({
          userId,
          feature: 'exam_sim',
          subfeature: 'mark_exam',
          provider: 'cloudflare',
          model: 'llama-3.3-70b-instruct-fp8-fast',
          promptTokens,
          completionTokens,
          latencyMs,
          success: true,
          requestMetadata: { promptLength: prompt.length, maxTokens: 3000 },
        });
        
        return text;
      }
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      
      await logAIUsage({
        userId,
        feature: 'exam_sim',
        subfeature: 'mark_exam',
        provider: 'cloudflare',
        model: 'llama-3.3-70b-instruct-fp8-fast',
        promptTokens,
        completionTokens: 0,
        latencyMs,
        success: false,
        errorMessage: err.message,
        errorCode: err.constructor.name,
        requestMetadata: { promptLength: prompt.length, maxTokens: 3000 },
      });
      
      console.error("Cloudflare failed:", err);
    }
  }

  /* 2. OpenAI */
  if (process.env.OPENAI_API_KEY) {
    const startTime = Date.now();
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 3000,
          temperature: 0.3,
        }),
      });

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) {
        const latencyMs = Date.now() - startTime;
        const completionTokens = Math.ceil(text.length / 4);
        
        await logAIUsage({
          userId,
          feature: 'exam_sim',
          subfeature: 'mark_exam',
          provider: 'openai',
          model: 'gpt-4o-mini',
          promptTokens,
          completionTokens,
          latencyMs,
          success: true,
          requestMetadata: { promptLength: prompt.length, maxTokens: 3000 },
        });
        
        return text;
      }
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      
      await logAIUsage({
        userId,
        feature: 'exam_sim',
        subfeature: 'mark_exam',
        provider: 'openai',
        model: 'gpt-4o-mini',
        promptTokens,
        completionTokens: 0,
        latencyMs,
        success: false,
        errorMessage: err.message,
        errorCode: err.constructor.name,
        requestMetadata: { promptLength: prompt.length, maxTokens: 3000 },
      });
      
      console.error("OpenAI failed:", err);
    }
  }

  /* 3. Gemini fallback */
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean);

  for (const key of geminiKeys) {
    for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
      const startTime = Date.now();
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const latencyMs = Date.now() - startTime;
          const completionTokens = Math.ceil(text.length / 4);
          
          await logAIUsage({
            userId,
            feature: 'exam_sim',
            subfeature: 'mark_exam',
            provider: 'gemini',
            model,
            promptTokens,
            completionTokens,
            latencyMs,
            success: true,
            requestMetadata: { promptLength: prompt.length, maxTokens: 3000 },
          });
          
          return text;
        }
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        
        await logAIUsage({
          userId,
          feature: 'exam_sim',
          subfeature: 'mark_exam',
          provider: 'gemini',
          model,
          promptTokens,
          completionTokens: 0,
          latencyMs,
          success: false,
          errorMessage: err.message,
          errorCode: err.constructor.name,
          requestMetadata: { promptLength: prompt.length, maxTokens: 3000 },
        });
        
        console.error(`Gemini ${model} failed:`, err);
      }
    }
  }

  return null;
}

/* ─────────────────────────────────────────────
   GRADE SYSTEM
───────────────────────────────────────────── */

function getGrade(p) {
  if (p >= 90) return "A*";
  if (p >= 80) return "A";
  if (p >= 70) return "B";
  if (p >= 60) return "C";
  if (p >= 50) return "D";
  if (p >= 40) return "E";
  return "U";
}

/* ─────────────────────────────────────────────
   MAIN ROUTE
───────────────────────────────────────────── */

export async function POST(req) {
  try {
    // Apply rate limiting for AI-powered endpoint
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck;

    const body = await req.json();
    
    // Validate request body
    const validation = validateRequestBody(body, examMarkSchema);
    if (!validation.success) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validation.details?.issues.map(e => ({ field: e.path.join('.'), message: e.message }))
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const {
      subject,
      difficulty,
      questions,
      answers,
      timeTaken,
      userId,
    } = validation.data;

    if (!subject || !questions || !answers) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* ─────────────────────────────
       BUILD MARKING INPUT
    ───────────────────────────── */

    const qaText = questions
      .map((q, i) => {
        const answer = answers.find((a) => a.questionId === q.id);

        return `
Q${i + 1} [${q.type}, ${q.marks} marks, topic: ${q.topic}]
Question: ${q.question}
Options: ${q.options ? q.options.join(", ") : "N/A"}
Student answer: ${answer?.answer || "(no answer)"}
Time spent: ${answer?.timeSpent || 0}s
        `;
      })
      .join("\n");

    const prompt = `
You are an expert ${subject} examiner.

Mark this exam carefully.

Return ONLY valid JSON:

{
  "results": [
    {
      "questionId": 1,
      "score": 0,
      "maxScore": 1,
      "correct": false,
      "feedback": "short explanation",
      "modelAnswer": "correct answer",
      "topic": "topic"
    }
  ],
  "weakAreas": [],
  "strongAreas": [],
  "cortexInsight": "neutral analytical summary of performance"
}

Rules:
- MCQ: full or zero marks only
- Structured: partial credit allowed
- Keep feedback short and factual
- weakAreas = topics < 50%
- strongAreas = topics > 80%

EXAM DATA:
${qaText}
    `;

    /* ─────────────────────────────
       CALL AI
    ───────────────────────────── */

    const text = await callAI(prompt, userId);

    if (!text) {
      return NextResponse.json(
        { error: "All AI models unavailable" },
        { status: 503 }
      );
    }

    /* ─────────────────────────────
       SAFE JSON PARSE
    ───────────────────────────── */

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 500 }
      );
    }

    const markingData = JSON.parse(jsonMatch[0]);

    /* ─────────────────────────────
       SCORE CALCULATION
    ───────────────────────────── */

    const totalScore = markingData.results.reduce(
      (sum, r) => sum + (r.score || 0),
      0
    );

    const maxScore = questions.reduce(
      (sum, q) => sum + q.marks,
      0
    );

    const percentage =
      maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    const grade = getGrade(percentage);

    /* ─────────────────────────────
       CORTEX INTEGRATION (🔥 MAIN FIX)
    ───────────────────────────── */

    if (userId) {
      await updateCortexFromExam({
        userId,
        subject,
        percentage,
        weakAreas: markingData.weakAreas || [],
        strongAreas: markingData.strongAreas || [],
      });

      await emitCortexEvent({
        userId,
        type: "exam.marking.completed",
        source: "exam",
        data: {
          subject,
          percentage,
          grade,
        },
      });

      // Emit unified event
      await emitExamCompleted(userId, {
        examId: crypto.randomUUID(),
        subject,
        topic: difficulty,
        score: percentage,
        totalMarks: maxScore,
        grade,
        weakAreas: markingData.weakAreas || [],
        strongAreas: markingData.strongAreas || [],
        timeSpent: timeTaken,
      }, "exam");
    }

    /* ─────────────────────────────
       RESPONSE
    ───────────────────────────── */

    return NextResponse.json({
      ...markingData,
      totalScore,
      maxScore,
      percentage,
      grade,
      timeTaken,
    });
  } catch (err) {
    console.error("Marking error:", err);

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
