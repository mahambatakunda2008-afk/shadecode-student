import { NextResponse } from "next/server";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { updateCortexFromExam, emitCortexEvent } from "@/lib/cortex";
import { emitExamCompleted } from "@/lib/events";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examMarkSchema, validateRequestBody } from "@/lib/validation/schemas";
import { getVerifiedUser } from "@/lib/supabase/auth-helpers";
import { callAI } from "@/lib/ai";
import { repairAndParseJSON } from "@/lib/ai/parseJson";
import { calculateExamScore, computeTopicScores } from "@/lib/exam/scoring";
import { blendMastery } from "@/lib/topicMastery/blend";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

function isMarkingShape(value) { return Boolean(value && typeof value === "object" && Array.isArray(value.results)); }

function normalizeMarkingData(value, questions) {
  if (!isMarkingShape(value)) return null;
  const byId = new Map(questions.map((q) => [String(q.id), q]));
  const results = value.results.map((r) => {
    const question = byId.get(String(r?.questionId));
    if (!question) return null;
    const maxScore = Math.max(0, Number(question.marks) || 0);
    const rawScore = Number(r?.score);
    const score = Number.isFinite(rawScore) ? Math.min(maxScore, Math.max(0, rawScore)) : 0;
    return {
      questionId: question.id,
      score,
      maxScore,
      correct: Boolean(r?.correct) && score >= maxScore,
      feedback: typeof r?.feedback === "string" ? r.feedback.slice(0, 1000) : "No feedback provided.",
      modelAnswer: typeof r?.modelAnswer === "string" ? r.modelAnswer.slice(0, 2000) : "",
      topic: typeof r?.topic === "string" && r.topic.trim() ? r.topic.trim() : question.topic,
    };
  }).filter(Boolean);
  const weakAreas = Array.isArray(value.weakAreas) ? value.weakAreas.filter((x) => typeof x === "string").slice(0, 20) : [];
  const strongAreas = Array.isArray(value.strongAreas) ? value.strongAreas.filter((x) => typeof x === "string").slice(0, 20) : [];
  const cortexInsight = typeof value.cortexInsight === "string" ? value.cortexInsight.slice(0, 2000) : "";
  return { results, weakAreas, strongAreas, cortexInsight };
}

function normalizeWords(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter((x) => x.length > 2); }

function markDeterministic(questions, answers) {
  const answerMap = new Map((answers || []).map((a) => [String(a.questionId), String(a.answer || "").trim()]));
  const results = questions.map((q) => {
    const answer = answerMap.get(String(q.id)) || "";
    const model = String(q.modelAnswer || "").trim();
    if (q.type === "multiple_choice") {
      const correct = Boolean(answer && model && answer.toLowerCase() === model.toLowerCase());
      return { questionId: q.id, score: correct ? q.marks : 0, maxScore: q.marks, correct, feedback: correct ? "Correct." : `Incorrect. The expected answer is ${model}.`, modelAnswer: model, topic: q.topic };
    }
    const expected = new Set(normalizeWords(model));
    const given = new Set(normalizeWords(answer));
    const overlap = expected.size ? [...expected].filter((word) => given.has(word)).length / expected.size : 0;
    const score = answer && model ? Math.max(0, Math.min(q.marks, Math.round(q.marks * Math.min(1, overlap * 1.35)))) : 0;
    const correct = score >= q.marks;
    return {
      questionId: q.id,
      score,
      maxScore: q.marks,
      correct,
      feedback: answer ? (correct ? "Your answer matches the expected points." : "Partial credit awarded from the answer's overlap with the expected points. AI marking can provide deeper examiner feedback when available.") : "No answer submitted.",
      modelAnswer: model,
      topic: q.topic,
    };
  });
  const topicScores = computeTopicScores(questions, results);
  const weakAreas = topicScores.filter((x) => x.percentage < 50).map((x) => x.topic).slice(0, 20);
  const strongAreas = topicScores.filter((x) => x.percentage > 80).map((x) => x.topic).slice(0, 20);
  return { results, weakAreas, strongAreas, cortexInsight: "This paper was marked locally because AI marking was unavailable. MCQs use exact answers; written responses use conservative keyword overlap, so treat partial written scores as provisional." };
}

export async function POST(req) {
  try {
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck;
    const { user, error: authError } = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ error: authError || "You need to be signed in to mark an exam." }, { status: 401 });

    const body = await req.json();
    const validation = validateRequestBody(body, examMarkSchema);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: validation.details?.issues.map((e) => ({ field: e.path.join("."), message: e.message })) }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { subject, difficulty, questions, answers, timeTaken } = validation.data;
    const userId = user.id;
    if (!subject || !questions || !answers) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    let markingData = null;
    const deterministicPaper = questions.length > 0 && questions.every((q) => String(q.id).startsWith("fallback_"));

    if (deterministicPaper) {
      markingData = markDeterministic(questions, answers);
    } else {
      const qaText = questions.map((q, i) => {
        const answer = answers.find((a) => a.questionId === q.id);
        return `\nQ${i + 1} [${q.type}, ${q.marks} marks, topic: ${q.topic}]\nQuestion: ${q.question}\nOptions: ${q.options ? q.options.join(", ") : "N/A"}\nStudent answer: ${answer?.answer || "(no answer)"}\nTime spent: ${answer?.timeSpent || 0}s\n`;
      }).join("\n");
      const prompt = `You are an expert ${subject} examiner.\n\nMark this exam carefully.\n\nReturn ONLY valid JSON:\n{\n  "results": [{"questionId": 1, "score": 0, "maxScore": 1, "correct": false, "feedback": "short explanation", "modelAnswer": "correct answer", "topic": "topic"}],\n  "weakAreas": [],\n  "strongAreas": [],\n  "cortexInsight": "neutral analytical summary of performance"\n}\n\nRules:\n- MCQ: full or zero marks only\n- Structured: partial credit allowed\n- Keep feedback short and factual\n- weakAreas = topics < 50%\n- strongAreas = topics > 80%\n\nEXAM DATA:\n${qaText}`;

      for (let attempt = 1; attempt <= 2 && !markingData; attempt++) {
        const text = await callAI(prompt, 3000, { userId, feature: "exam_sim", subfeature: "mark_exam", maxChainMs: 20000, perProviderMaxMs: 7000 });
        if (!text) continue;
        markingData = normalizeMarkingData(repairAndParseJSON(text, isMarkingShape), questions);
      }
      if (!markingData) markingData = markDeterministic(questions, answers);
    }

    const { totalScore, maxScore, percentage, grade } = calculateExamScore(questions, markingData.results);

    try {
      await updateCortexFromExam({ userId, subject, percentage, weakAreas: markingData.weakAreas, strongAreas: markingData.strongAreas });
      await emitCortexEvent({ userId, type: "exam.marking.completed", source: "exam", data: { subject, percentage, grade } });
      await emitExamCompleted(userId, { examId: crypto.randomUUID(), subject, topic: difficulty, score: percentage, totalMarks: maxScore, grade, weakAreas: markingData.weakAreas, strongAreas: markingData.strongAreas, timeSpent: timeTaken }, "exam");
    } catch (eventError) {
      console.error("[exam/mark] Cortex/event persistence failed:", eventError);
    }

    try {
      const svc = createSupabaseServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data: existingMemory } = await svc.from("cortex_memory").select("exam_scores").eq("user_id", userId).maybeSingle();
      const priorScores = Array.isArray(existingMemory?.exam_scores) ? existingMemory.exam_scores : [];
      const newScores = [...priorScores, { examId: crypto.randomUUID(), subject, score: totalScore, totalMarks: maxScore, percentage, grade, weakAreas: markingData.weakAreas, strongAreas: markingData.strongAreas, date: new Date().toISOString() }];
      const avgScore = Math.round(newScores.reduce((sum, s) => sum + (s.percentage ?? s.score ?? 0), 0) / newScores.length);
      const { error: memoryError } = await svc.from("cortex_memory").upsert({ user_id: userId, exam_scores: newScores, average_exam_score: avgScore }, { onConflict: "user_id" });
      if (memoryError) console.error("[exam/mark] Failed to persist exam_scores:", memoryError.message);
    } catch (memErr) { console.error("[exam/mark] cortex_memory update threw:", memErr); }

    try {
      const svc2 = createSupabaseServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
      const topicScores = computeTopicScores(questions, markingData.results);
      if (topicScores.length > 0) {
        const { data: existingRows } = await svc2.from("topic_mastery").select("topic, mastery_score, attempts").eq("user_id", userId).eq("subject", subject).in("topic", topicScores.map((t) => t.topic));
        const existingByTopic = new Map((existingRows || []).map((r) => [r.topic, r]));
        const now = new Date().toISOString();
        const upsertRows = topicScores.map((t) => {
          const existing = existingByTopic.get(t.topic);
          const update = blendMastery(existing ? { mastery_score: existing.mastery_score, attempts: existing.attempts } : null, t.percentage);
          return { user_id: userId, subject, topic: t.topic, mastery_score: update.mastery_score, last_score: update.last_score, attempts: update.attempts, trend: update.trend, last_attempted: now };
        });
        const { error: masteryError } = await svc2.from("topic_mastery").upsert(upsertRows, { onConflict: "user_id,subject,topic" });
        if (masteryError) console.error("[exam/mark] Failed to persist topic_mastery:", masteryError.message);
      }
    } catch (masteryErr) { console.error("[exam/mark] topic_mastery update threw:", masteryErr); }

    return NextResponse.json({ ...markingData, totalScore, maxScore, percentage, grade, timeTaken });
  } catch (err) {
    console.error("Marking error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
