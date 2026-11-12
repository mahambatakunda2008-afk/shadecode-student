import { NextResponse } from "next/server";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { updateCortexFromExam } from "@/lib/cortex";
import { emitExamCompleted } from "@/lib/events";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type OutboxPayload = {
  eventId: string;
  examId: string;
  subject: string;
  difficulty?: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  weakAreas: string[];
  strongAreas: string[];
  timeTaken: number;
  topicScores: Array<{ topic: string; percentage: number }>;
};

function serviceClient() {
  return createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

async function processOutbox(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Outbox worker is not configured" }, { status: 503 });
  }

  const svc = serviceClient();
  const { data: jobs, error: claimError } = await svc.rpc("claim_exam_completion_outbox", {
    p_limit: 10,
  });

  if (claimError) {
    console.error("[exam-outbox] Claim failed:", claimError.message);
    return NextResponse.json({ error: "Could not claim outbox jobs" }, { status: 503 });
  }

  let completed = 0;
  let failed = 0;

  for (const job of jobs ?? []) {
    const payload = job.payload as OutboxPayload;
    try {
      if (
        !payload?.eventId ||
        !payload.subject ||
        !Number.isFinite(payload.score) ||
        !Number.isFinite(payload.maxScore) ||
        payload.maxScore <= 0
      ) {
        throw new Error("Outbox payload failed validation");
      }

      await updateCortexFromExam({
        userId: job.user_id,
        subject: payload.subject,
        score: payload.score,
        maxScore: payload.maxScore,
        eventId: payload.eventId,
      });

      const scoreIdentity = `attempt:${job.attempt_id}`;
      const { error: memoryError } = await svc.rpc("record_exam_score", {
        p_user_id: job.user_id,
        p_score: {
          examId: payload.examId,
          submissionIdentity: scoreIdentity,
          subject: payload.subject,
          score: payload.score,
          totalMarks: payload.maxScore,
          percentage: payload.percentage,
          grade: payload.grade,
          weakAreas: payload.weakAreas ?? [],
          strongAreas: payload.strongAreas ?? [],
          date: new Date().toISOString(),
        },
      });
      if (memoryError) throw new Error(`Cortex score memory: ${memoryError.message}`);

      for (const topicScore of payload.topicScores ?? []) {
        if (
          !topicScore ||
          typeof topicScore.topic !== "string" ||
          !topicScore.topic.trim() ||
          !Number.isFinite(topicScore.percentage) ||
          topicScore.percentage < 0 ||
          topicScore.percentage > 100
        ) {
          throw new Error("Exam topic mastery payload failed validation");
        }
        const { data: projected, error: projectionError } = await svc.rpc("project_exam_topic_mastery", {
          p_user_id: job.user_id,
          p_attempt_id: job.attempt_id,
          p_subject: payload.subject,
          p_topic: topicScore.topic,
          p_percentage: topicScore.percentage,
          p_observed_at: new Date().toISOString(),
        });
        if (projectionError) {
          throw new Error(`Topic mastery projection (${topicScore.topic}): ${projectionError.message}`);
        }
      }

      await emitExamCompleted(
        job.user_id,
        {
          examId: payload.examId,
          subject: payload.subject,
          topic: payload.difficulty,
          score: payload.percentage,
          totalMarks: payload.maxScore,
          grade: payload.grade,
          weakAreas: payload.weakAreas ?? [],
          strongAreas: payload.strongAreas ?? [],
          timeSpent: payload.timeTaken,
        },
        "exam",
      );

      const { data: finished, error: finishError } = await svc.rpc("finish_exam_completion_outbox", {
        p_id: job.id,
        p_claim_token: job.claim_token,
        p_error: null,
      });
      if (finishError || finished !== true) {
        throw new Error(finishError?.message || "Outbox completion lease was lost");
      }
      completed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown outbox processing error";
      console.error("[exam-outbox] Job failed:", job.id, message);
      await svc.rpc("finish_exam_completion_outbox", {
        p_id: job.id,
        p_claim_token: job.claim_token,
        p_error: message,
      });
      failed += 1;
    }
  }

  return NextResponse.json({
    claimed: jobs?.length ?? 0,
    completed,
    failed,
  });
}

export async function GET(req: Request) {
  return processOutbox(req);
}

export async function POST(req: Request) {
  return processOutbox(req);
}
