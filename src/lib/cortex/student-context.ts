import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EvidenceState = "available" | "insufficient_evidence" | "unavailable";

export interface StudentProfileMemory {
  state: EvidenceState;
  source: "cortex_memory";
  observedAt: string | null;
  level: number | null;
  streak: number | null;
  frequentlyStudiedSubjects: string[];
  strongSubjects: string[];
  weakSubjects: string[];
  totalStudySessions: number | null;
  totalLessonsCompleted: number | null;
  averageExamScore: number | null;
}

export interface StudentTopicEvidence {
  topicId: string;
  subjectId: string;
  masteryScore: number | null;
  attempts: number;
  retention: number | null;
  confidence: number | null;
  stability: number | null;
  errorRate: number | null;
  uncertainty: number | null;
  lastObservedAt: string | null;
  evidenceState: EvidenceState;
  source: "topic_mastery";
}

export interface CortexStudentContext {
  schemaVersion: 1;
  generatedAt: string;
  profile: StudentProfileMemory;
  topics: {
    state: EvidenceState;
    source: "topic_mastery";
    evidenceCount: number;
    items: StudentTopicEvidence[];
  };
}

/**
 * Resolve the current authenticated learner's durable Cortex context.
 *
 * This function intentionally accepts no user ID. Identity comes only from
 * the server-side Supabase session, preventing callers from selecting another
 * learner's records. Query failures throw; an absent row is represented as
 * insufficient evidence rather than being confused with a database outage.
 */
export async function resolveAuthenticatedCortexStudentContext(): Promise<CortexStudentContext> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("UNAUTHENTICATED");
  }

  const userId = authData.user.id;
  const [profileResult, topicsResult] = await Promise.all([
    supabase
      .from("cortex_memory")
      .select("level, current_streak, frequently_studied_subjects, strong_subjects, weak_subjects, total_study_sessions, total_lessons_completed, average_exam_score, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("topic_mastery")
      .select("topic, subject, mastery_score, attempts, retention, confidence, stability, error_rate, uncertainty, last_attempted")
      .eq("user_id", userId)
      .order("last_attempted", { ascending: false })
      .limit(200),
  ]);

  if (profileResult.error) {
    console.error("[cortex student context] profile read failed:", profileResult.error);
    throw new Error("STUDENT_CONTEXT_PROFILE_UNAVAILABLE");
  }
  if (topicsResult.error) {
    console.error("[cortex student context] topic evidence read failed:", topicsResult.error);
    throw new Error("STUDENT_CONTEXT_TOPICS_UNAVAILABLE");
  }

  const profile = profileResult.data;
  const profileState: EvidenceState = profile ? "available" : "insufficient_evidence";
  const topicRows = topicsResult.data ?? [];
  const topics: StudentTopicEvidence[] = topicRows.map((row) => ({
    topicId: row.topic,
    subjectId: row.subject,
    masteryScore: typeof row.mastery_score === "number" ? row.mastery_score : null,
    attempts: Math.max(0, Number(row.attempts) || 0),
    retention: typeof row.retention === "number" ? row.retention : null,
    confidence: typeof row.confidence === "number" ? row.confidence : null,
    stability: typeof row.stability === "number" ? row.stability : null,
    errorRate: typeof row.error_rate === "number" ? row.error_rate : null,
    uncertainty: typeof row.uncertainty === "number" ? row.uncertainty : null,
    lastObservedAt: row.last_attempted,
    evidenceState: Number(row.attempts) > 0 ? "available" : "insufficient_evidence",
    source: "topic_mastery",
  }));

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    profile: {
      state: profileState,
      source: "cortex_memory",
      observedAt: profile?.updated_at ?? null,
      level: profile?.level ?? null,
      streak: profile?.current_streak ?? null,
      frequentlyStudiedSubjects: profile?.frequently_studied_subjects ?? [],
      strongSubjects: profile?.strong_subjects ?? [],
      weakSubjects: profile?.weak_subjects ?? [],
      totalStudySessions: profile?.total_study_sessions ?? null,
      totalLessonsCompleted: profile?.total_lessons_completed ?? null,
      averageExamScore: profile?.average_exam_score ?? null,
    },
    topics: {
      state: topics.length > 0 ? "available" : "insufficient_evidence",
      source: "topic_mastery",
      evidenceCount: topics.reduce((count, item) => count + item.attempts, 0),
      items: topics,
    },
  };
}
