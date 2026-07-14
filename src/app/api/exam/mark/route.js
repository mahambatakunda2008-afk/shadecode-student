import { NextResponse } from "next/server";
import { updateCortexFromExam, emitCortexEvent } from "@/lib/cortex";
import { emitExamCompleted } from "@/lib/events";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examMarkSchema, validateRequestBody } from "@/lib/validation/schemas";
import { callAI } from "@/lib/ai";

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

    const text = await callAI(prompt, 3000, { userId, feature: "exam_sim", subfeature: "mark_exam" });

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
