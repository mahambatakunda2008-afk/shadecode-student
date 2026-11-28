import { NextResponse } from "next/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examMarkSchema, validateRequestBody } from "@/lib/validation/schemas";
import { getVerifiedUser } from "@/lib/supabase/auth-helpers";
import { executeCortexText } from "@/lib/cortex/runtime/execution";
import { repairAndParseJSON } from "@/lib/ai/parseJson";
import { calculateExamScore, computeTopicScores } from "@/lib/exam/scoring";
import { markNumeric } from "@/lib/exam/engine/numeric";
import { verifyExamPaperProof } from "@/lib/exam/paper-provenance";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";
import { hashExamSubmission } from "@/lib/exam/submissionIdentity";

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
    if (q.numeric && typeof q.numeric.exact === "number" && typeof q.numeric.tolerance === "number") {
      const marked = answer ? markNumeric(answer, q.numeric) : { correct: false };
      const correct = marked.correct;
      return { questionId: q.id, score: correct ? q.marks : 0, maxScore: q.marks, correct, feedback: !answer ? "No answer submitted." : correct ? "Correct." : marked.mistake ? `Not quite. ${marked.mistake.hint}` : "Not quite. Check your working against the model answer.", modelAnswer: model, topic: q.topic, ...(marked.mistake ? { mistakeId: marked.mistake.id } : {}) };
    }
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
    const paperProvenance = verifyExamPaperProof(body?.paperProof, {
      userId: user.id,
      subjectId: typeof body?.subjectId === "string" ? body.subjectId : "",
      difficulty: /o-level/i.test(difficulty) ? "easy" : /a-level/i.test(difficulty) ? "medium" : /university/i.test(difficulty) ? "hard" : difficulty,
      source: "cortex",
      questions,
    });
    const userId = user.id;
    if (!subject || !questions || !answers) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    // Client-held question sets and reference answers are not authenticated paper provenance.
    // Keep marking available, but never persist scores or emit mastery/XP events from this route.

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
        const text = await executeCortexText(prompt, 3000, { operation: "exam.mark", userId, feature: "exam_sim", subfeature: "mark_exam", maxChainMs: 20000, perProviderMaxMs: 7000 });
        if (!text) continue;
        markingData = normalizeMarkingData(repairAndParseJSON(text, isMarkingShape), questions);
      }
      if (!markingData) markingData = markDeterministic(questions, answers);
    }

    const { totalScore, maxScore, percentage, grade } = calculateExamScore(questions, markingData.results);
    const submissionResult = { ...markingData, totalScore, maxScore, percentage, grade, timeTaken };
    let evidenceRecorded = false;
    let evidenceReason = paperProvenance.valid ? "attempt_identity_required" : "unverified_paper_provenance";

    // Only a server-signed paper, bound to this authenticated learner and exact
    // question set, can enter the trusted academic record. The attempt ledger
    // makes retries idempotent; the outbox projects Cortex/mastery asynchronously.
    if (paperProvenance.valid && typeof body?.attemptId === "string" && body.attemptId.trim()) {
      const admin = createSupabaseAdminClient();
      if (!admin) {
        evidenceReason = "trusted_submission_storage_unavailable";
      } else {
        const attemptId = body.attemptId.trim();
        const normalizedDifficulty = /o-level/i.test(difficulty) ? "easy" : /a-level/i.test(difficulty) ? "medium" : /university/i.test(difficulty) ? "hard" : difficulty;
        const payloadHash = hashExamSubmission({
          userId,
          attemptId,
          subject,
          subjectId: body.subjectId,
          difficulty: normalizedDifficulty,
          paperProof: body.paperProof,
          questions,
          answers,
          timeTaken: Number.isFinite(timeTaken) ? timeTaken : 0,
        });
        const { data: claims, error: claimError } = await admin.rpc("claim_exam_submission", {
          p_user_id: userId,
          p_attempt_id: attemptId,
          p_payload_hash: payloadHash,
        });

        if (claimError) {
          console.error("[exam/mark] Submission claim failed:", claimError.message);
          evidenceReason = "trusted_submission_claim_failed";
        } else {
          const claim = Array.isArray(claims) ? claims[0] : null;
          if (claim?.state === "completed" && claim.saved_result && typeof claim.saved_result === "object") {
            return NextResponse.json({
              ...claim.saved_result,
              evidenceRecorded: true,
              paperProvenanceVerified: true,
              paperSource: paperProvenance.source,
              evidenceReason: "already_recorded",
            });
          }

          if (claim?.state === "claimed" && claim.claim_token) {
            const topicScores = computeTopicScores(questions, markingData.results).map((item) => ({
              topic: item.topic,
              percentage: item.percentage,
            }));
            const eventId = randomUUID();
            const completionEvent = {
              eventId,
              examId: attemptId,
              subject,
              syllabusId: null,
              difficulty: normalizedDifficulty,
              paperSource: paperProvenance.source,
              score: totalScore,
              maxScore,
              percentage,
              grade,
              weakAreas: markingData.weakAreas ?? [],
              strongAreas: markingData.strongAreas ?? [],
              timeTaken: Number.isFinite(timeTaken) ? Math.max(0, Math.floor(timeTaken)) : 0,
              topicScores,
            };
            const { data: completed, error: completeError } = await admin.rpc("complete_exam_submission", {
              p_user_id: userId,
              p_attempt_id: attemptId,
              p_payload_hash: payloadHash,
              p_claim_token: claim.claim_token,
              p_result: submissionResult,
              p_event: completionEvent,
            });
            if (!completeError && completed === true) {
              evidenceRecorded = true;
              evidenceReason = "verified_submission_recorded";
            } else {
              if (completeError) console.error("[exam/mark] Submission finalization failed:", completeError.message);
              evidenceReason = "trusted_submission_finalization_pending";
            }
          } else if (claim?.state === "processing") {
            evidenceReason = "submission_already_processing";
          } else if (claim?.state === "payload_conflict") {
            evidenceReason = "attempt_id_payload_conflict";
          } else {
            evidenceReason = "trusted_submission_claim_unavailable";
          }
        }
      }
    }

    return NextResponse.json({
      ...submissionResult,
      evidenceRecorded,
      paperProvenanceVerified: paperProvenance.valid,
      paperSource: paperProvenance.valid ? paperProvenance.source : null,
      evidenceReason,
    });
  } catch (err) {
    console.error("Marking error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
