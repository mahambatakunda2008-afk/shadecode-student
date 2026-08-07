import { NextResponse } from "next/server";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { updateCortexFromExam, emitCortexEvent } from "@/lib/cortex";
import { emitExamCompleted } from "@/lib/events";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examMarkSchema, validateRequestBody } from "@/lib/validation/schemas";
import { getVerifiedUser } from "@/lib/supabase/auth-helpers";
import { callAI } from "@/lib/ai";
import { repairAndParseJSON } from "@/lib/ai/parseJson";
import { calculateExamScore } from "@/lib/exam/scoring";

export const dynamic = "force-dynamic";

// AI marking can call multiple provider fallbacks sequentially at up to
// 3000 tokens each; the default serverless timeout was killing this mid
// fallback chain before lib/ai.ts's own (now-scaled) timeouts even got a
// chance to complete.
export const maxDuration = 90;

/* ─────────────────────────────────────────────
   MAIN ROUTE
───────────────────────────────────────────── */

export async function POST(req) {
  try {
    // Apply rate limiting for AI-powered endpoint
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck;

    const { user, error: authError } = await getVerifiedUser(req);
    if (!user) {
      return NextResponse.json({ error: authError || "You need to be signed in to mark an exam." }, { status: 401 });
    }

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
    } = validation.data;
    // userId comes from the verified session, never the request body --
    // see exam/generate/route.js for the same fix and full rationale.
    const userId = user.id;

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
       CALL AI (with one retry if the response comes back malformed —
       losing a student's completed exam attempt to a single bad JSON
       token from the model is worse than one extra AI call)
    ───────────────────────────── */

    function isMarkingShape(value) {
      return (
        value &&
        typeof value === "object" &&
        Array.isArray(value.results)
      );
    }

    let markingData = null;

    for (let attempt = 1; attempt <= 2 && !markingData; attempt++) {
      const text = await callAI(prompt, 3000, { userId, feature: "exam_sim", subfeature: "mark_exam" });

      if (!text) {
        if (attempt === 2) {
          return NextResponse.json(
            { error: "All AI models unavailable" },
            { status: 503 }
          );
        }
        continue;
      }

      markingData = repairAndParseJSON(text, isMarkingShape);

      if (!markingData) {
        console.error(
          `[exam/mark] JSON parse/repair failed on attempt ${attempt}. Raw excerpt:`,
          text.slice(0, 300)
        );
      }
    }

    if (!markingData) {
      return NextResponse.json(
        { error: "Marking failed after retry — please try submitting again." },
        { status: 500 }
      );
    }

    /* ─────────────────────────────
       SCORE CALCULATION
    ───────────────────────────── */

    const { totalScore, maxScore, percentage, grade } = calculateExamScore(
      questions,
      markingData.results
    );

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

      // Actually persist this exam's score into cortex_memory.exam_scores.
      // updateCortexFromExam() above does NOT do this -- it only emits to
      // an in-memory (non-persistent across serverless invocations) event
      // store and generates an AI insight string. Without this write,
      // totalExamsCompleted (read from exam_scores.length in
      // lib/cortex/achievements.ts) is permanently 0 for every user,
      // which silently blocks the first_exam / exam_pro_10 / exam_master
      // achievements from ever unlocking.
      try {
        const svc = createSupabaseServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        const { data: existingMemory } = await svc
          .from("cortex_memory")
          .select("exam_scores")
          .eq("user_id", userId)
          .maybeSingle();

        const priorScores = Array.isArray(existingMemory?.exam_scores) ? existingMemory.exam_scores : [];
        const newScores = [
          ...priorScores,
          {
            examId: crypto.randomUUID(),
            subject,
            score: totalScore,
            totalMarks: maxScore,
            percentage,
            grade,
            weakAreas: markingData.weakAreas || [],
            strongAreas: markingData.strongAreas || [],
            date: new Date().toISOString(),
          },
        ];
        const avgScore = Math.round(newScores.reduce((sum, s) => sum + (s.percentage ?? s.score ?? 0), 0) / newScores.length);

        const { error: memoryError } = await svc
          .from("cortex_memory")
          .upsert(
            { user_id: userId, exam_scores: newScores, average_exam_score: avgScore },
            { onConflict: "user_id" }
          );
        if (memoryError) console.error("[exam/mark] Failed to persist exam_scores:", memoryError.message);
      } catch (memErr) {
        console.error("[exam/mark] cortex_memory update threw:", memErr);
      }
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
