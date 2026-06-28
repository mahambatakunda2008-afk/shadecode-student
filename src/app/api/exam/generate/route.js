// src/app/api/exam/generate/route.js
import { NextResponse } from "next/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examGenerateSchema, validateRequestBody } from "@/lib/validation/schemas";
import { logAIUsage } from "@/lib/ai/tracker";
import { createServerClient } from "@/lib/supabase/server";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

async function callAI(prompt, userId) {
  const promptTokens = Math.ceil(prompt.length / 4);

  if (process.env.CLOUDFLARE_API_TOKEN) {
    const startTime = Date.now();
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: 3000 }),
        }
      );
      const data = await res.json();
      const text = typeof data?.result?.response === "string" 
  ? data.result.response 
  : JSON.stringify(data?.result?.response || "");
      if (text) {
        const latencyMs = Date.now() - startTime;
        const completionTokens = Math.ceil(text.length / 4);
        
        await logAIUsage({
          userId,
          feature: 'exam_sim',
          subfeature: 'generate_exam',
          provider: 'cloudflare',
          model: 'llama-3.3-70b-instruct-fp8-fast',
          promptTokens,
          completionTokens,
          latencyMs,
          success: true,
          requestMetadata: { promptLength: prompt.length, maxTokens: 3000 },
        });
        
        console.log("Cloudflare success");
        return text;
      }
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      
      await logAIUsage({
        userId,
        feature: 'exam_sim',
        subfeature: 'generate_exam',
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

  if (process.env.OPENAI_API_KEY) {
    const startTime = Date.now();
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 3000 }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        const latencyMs = Date.now() - startTime;
        const completionTokens = Math.ceil(text.length / 4);
        
        await logAIUsage({
          userId,
          feature: 'exam_sim',
          subfeature: 'generate_exam',
          provider: 'openai',
          model: 'gpt-4o-mini',
          promptTokens,
          completionTokens,
          latencyMs,
          success: true,
          requestMetadata: { promptLength: prompt.length, maxTokens: 3000 },
        });
        
        console.log("OpenAI success");
        return text;
      }
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      
      await logAIUsage({
        userId,
        feature: 'exam_sim',
        subfeature: 'generate_exam',
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

  const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3].filter(Boolean);
  for (const key of geminiKeys) {
    for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
      const startTime = Date.now();
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const latencyMs = Date.now() - startTime;
          const completionTokens = Math.ceil(text.length / 4);
          
          await logAIUsage({
            userId,
            feature: 'exam_sim',
            subfeature: 'generate_exam',
            provider: 'gemini',
            model,
            promptTokens,
            completionTokens,
            latencyMs,
            success: true,
            requestMetadata: { promptLength: prompt.length, maxTokens: 3000 },
          });
          
          console.log(`Gemini ${model} success`);
          return text;
        }
      } catch (err) {
        const latencyMs = Date.now() - startTime;
        
        await logAIUsage({
          userId,
          feature: 'exam_sim',
          subfeature: 'generate_exam',
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

  if (process.env.OPENROUTER_API_KEY) {
    const startTime = Date.now();
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://shadecodestudent.vercel.app" },
        body: JSON.stringify({ model: "meta-llama/llama-3.3-70b-instruct:free", messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) {
        const latencyMs = Date.now() - startTime;
        const completionTokens = Math.ceil(text.length / 4);
        
        await logAIUsage({
          userId,
          feature: 'exam_sim',
          subfeature: 'generate_exam',
          provider: 'openrouter',
          model: 'llama-3.3-70b-instruct',
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
        subfeature: 'generate_exam',
        provider: 'openrouter',
        model: 'llama-3.3-70b-instruct',
        promptTokens,
        completionTokens: 0,
        latencyMs,
        success: false,
        errorMessage: err.message,
        errorCode: err.constructor.name,
        requestMetadata: { promptLength: prompt.length, maxTokens: 3000 },
      });
      
      console.error("OpenRouter failed:", err);
    }
  }

  return null;
}

export async function POST(req) {
  try {
    // Apply rate limiting for AI-powered endpoint
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck;

    const body = await req.json();
    
    // Validate request body
    const validation = validateRequestBody(body, examGenerateSchema);
    if (!validation.success) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validation.details?.issues.map(e => ({ field: e.path.join('.'), message: e.message }))
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const { subject, topic, difficulty, questionCount, userId } = validation.data;

    const prompt = `You are an expert ${subject} examiner generating an exam paper.

Generate exactly ${questionCount} exam questions for:
- Subject: ${subject}
- Topic: ${topic || "mixed topics across the full syllabus"}
- Standard: ${difficulty}

Create a MIX of question types:
- ~40% Multiple choice (4 options each)
- ~30% Short answer (2-4 marks each)
- ~30% Structured/extended (4-8 marks each)

Respond ONLY with valid JSON, no other text:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "topic": "specific topic name",
      "question": "Question text here",
      "options": ["A) option", "B) option", "C) option", "D) option"],
      "marks": 1
    },
    {
      "id": 2,
      "type": "short_answer",
      "topic": "specific topic name",
      "question": "Question text here",
      "marks": 3
    },
    {
      "id": 3,
      "type": "structured",
      "topic": "specific topic name",
      "question": "Question text here. Show all working.",
      "marks": 6
    }
  ]
}

Rules:
- Questions must be exam-quality, specific, and answerable
- Vary difficulty within the paper
- Topics must be realistic for ${subject} at ${difficulty}
- Marks should reflect question complexity
- For MCQ, only include options array
- Write all math in plain text not LaTeX`;

    const text = await callAI(prompt, userId);
    if (!text) return NextResponse.json({ error: "All AI models unavailable. Try again shortly." }, { status: 503 });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const data = JSON.parse(jsonMatch[0]);
    
    // Store generated exam in Supabase if userId is provided
    let examId = null;
    if (userId) {
      try {
        const supabase = await createServerClient();
        const examData = {
          user_id: userId,
          subject: subject,
          topic: topic || null,
          difficulty: difficulty,
          questions: data.questions,
          question_count: questionCount,
          created_at: new Date().toISOString()
        };
        
        const { data: insertedExam, error: insertError } = await supabase
          .from('exams')
          .insert(examData)
          .select('id')
          .single();
        
        if (insertError) {
          console.error("Failed to store exam in Supabase:", insertError);
        } else {
          examId = insertedExam.id;
        }
      } catch (dbError) {
        console.error("Database error during exam storage:", dbError);
      }
    }
    
    return NextResponse.json({
      exam_id: examId,
      questions: data.questions,
      metadata: {
        subject,
        topic,
        difficulty,
        question_count: questionCount
      }
    });
  } catch (err) {
    console.error("Exam generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
