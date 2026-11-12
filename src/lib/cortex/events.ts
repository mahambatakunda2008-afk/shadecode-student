import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

type PracticeEventInput = {
  userId: string;
  accessToken?: string;
  payload: Record<string, unknown>;
  score: number | null;
  syllabusId?: string | null;
};

type PracticeEventResult = {
  recorded: boolean;
  reason?: "ungraded" | "missing_auth" | "missing_learning_context" | "missing_supabase_config";
};

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/**
 * Record only deterministic, verified practice evidence.
 *
 * The exact-match scorer currently emits either 100 or null. A null score is
 * deliberately not converted into an incorrect answer. The event contains no
 * submitted answer or marking-guide text.
 */
export async function recordVerifiedPracticeAttempt(
  input: PracticeEventInput,
): Promise<PracticeEventResult> {
  if (input.score !== 100) return { recorded: false, reason: "ungraded" };
  if (!input.accessToken) return { recorded: false, reason: "missing_auth" };

  const attemptId = nonEmptyString(input.payload.attemptId);
  const subjectId = nonEmptyString(input.payload.subjectId);
  const topicId = nonEmptyString(input.payload.topicId) ?? nonEmptyString(input.payload.topic);
  const syllabusId = nonEmptyString(input.syllabusId);
  if (!input.userId || !attemptId || !subjectId || !topicId || !syllabusId) {
    return { recorded: false, reason: "missing_learning_context" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { recorded: false, reason: "missing_supabase_config" };
  }

  const questionId =
    nonEmptyString(input.payload.questionId) ??
    nonEmptyString(input.payload.entityId) ??
    attemptId;
  const identity = [input.userId, attemptId, questionId].join("\u001f");
  const digest = createHash("sha256").update(identity).digest("hex");
  const occurredAt = new Date().toISOString();

  const event = {
    eventId: `cortex_practice_${digest}`,
    sourceEventId: `cortex-practice:${digest}`,
    kind: "question_attempted",
    source: "cortex-practice",
    userId: input.userId,
    attemptId,
    entityId: questionId,
    subjectId,
    topicId,
    syllabusId,
    occurredAt,
    metadata: {
      correct: true,
      score: 100,
      gradingMethod: "exact_reference_match",
      syllabusId,
    },
  };

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${input.accessToken}` } },
  });
  const { data, error } = await supabase.rpc("insert_canonical_cortex_event", {
    p_user_id: input.userId,
    p_event: event,
  });

  if (error) throw error;
  return { recorded: Boolean(data) };
}
