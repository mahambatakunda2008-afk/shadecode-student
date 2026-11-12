import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deriveRecurringMistakes, deriveRepeatedTopicErrors, type RecurringMistake, type RepeatedTopicError } from "./mistake-patterns";
import { deriveSpacedRetrievalEvidence, type SpacedRetrievalEvidence } from "./spaced-retrieval";
import { deriveEvidenceBasedReviewSuggestions, type EvidenceBasedReviewSuggestion } from "./review-suggestions";

export type EvidenceState = "available" | "insufficient_evidence" | "unavailable";

export interface StudentProfileMemory {
  state: EvidenceState;
  source: "profiles+cortex_memory";
  observedAt: string | null;
  level: number | null;
  streak: number | null;
  subjects: string[];
  studyLevel: string | null;
  educationStage: string | null;
  curriculumDeclaration: {
    board: string | null;
    qualification: string | null;
    syllabusCode: string | null;
    syllabusYear: string | null;
    verified: false;
  } | null;
  frequentlyStudiedSubjects: string[];
  strongSubjects: string[];
  weakSubjects: string[];
  totalStudySessions: number | null;
  totalLessonsCompleted: number | null;
  averageExamScore: number | null;
}

export interface StudentTopicEvidence {
  topicId: string;
  subjectKey: string;
  syllabusId: string | null;
  curriculumTopicKey: string | null;
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
  mistakes: {
    state: EvidenceState;
    source: "cortex_events";
    inspectedEventCount: number;
    repeatedTopicErrors: RepeatedTopicError[];
    recurringMistakes: RecurringMistake[];
  };
  spacedRetrieval: {
    state: EvidenceState;
    source: "cortex_events";
    inspectedEventCount: number;
    topics: SpacedRetrievalEvidence[];
    interpretation: "descriptive_only";
  };
  reviewSuggestions: {
    state: EvidenceState;
    source: "cortex_events";
    items: EvidenceBasedReviewSuggestion[];
    interpretation: "evidence_backed_no_due_dates";
  };
}

/**
 * Resolve the current authenticated learner's durable Cortex context.
 *
 * This function accepts no user ID. It verifies either the current server
 * session or a supplied bearer token with Supabase Auth, then uses that same
 * identity for RLS-scoped reads. Query failures throw; absent rows are
 * represented as insufficient evidence rather than database outages.
 */
export async function resolveAuthenticatedCortexStudentContext(accessToken?: string): Promise<CortexStudentContext> {
  const supabase = accessToken
    ? createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: { autoRefreshToken: false, persistSession: false },
          global: { headers: { Authorization: `Bearer ${accessToken}` } },
        },
      )
    : await createSupabaseServerClient();
  const { data: authData, error: authError } = accessToken
    ? await supabase.auth.getUser(accessToken)
    : await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error("UNAUTHENTICATED");
  }

  const userId = authData.user.id;
  const [academicProfileResult, memoryResult, topicsResult, mistakeEventsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("level, subjects, study_level, education_stage, curriculum_board, qualification, syllabus_code, syllabus_year, created_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("cortex_memory")
      .select("current_streak, frequently_studied_subjects, strong_subjects, weak_subjects, total_study_sessions, total_lessons_completed, average_exam_score, updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("topic_mastery")
      .select("topic, subject, syllabus_id, curriculum_topic_key, mastery_score, attempts, retention, confidence, stability, error_rate, uncertainty, last_attempted")
      .eq("user_id", userId)
      .order("last_attempted", { ascending: false })
      .limit(200),
    supabase
      .from("cortex_events")
      .select("type, data, created_at")
      .eq("user_id", userId)
      .eq("type", "question_attempted")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (academicProfileResult.error) {
    console.error("[cortex student context] academic profile read failed:", academicProfileResult.error);
    throw new Error("STUDENT_CONTEXT_PROFILE_UNAVAILABLE");
  }
  if (memoryResult.error) {
    console.error("[cortex student context] durable memory read failed:", memoryResult.error);
    throw new Error("STUDENT_CONTEXT_MEMORY_UNAVAILABLE");
  }
  if (topicsResult.error) {
    console.error("[cortex student context] topic evidence read failed:", topicsResult.error);
    throw new Error("STUDENT_CONTEXT_TOPICS_UNAVAILABLE");
  }

  if (mistakeEventsResult.error) {
    console.error("[cortex student context] learning-event read failed:", mistakeEventsResult.error);
    throw new Error("STUDENT_CONTEXT_EVENTS_UNAVAILABLE");
  }

  const academicProfile = academicProfileResult.data;
  const memory = memoryResult.data;
  const profileState: EvidenceState = academicProfile || memory ? "available" : "insufficient_evidence";
  const topicRows = topicsResult.data ?? [];
  const topics: StudentTopicEvidence[] = topicRows.map((row) => {
    const attempts = Math.max(0, Number(row.attempts) || 0);
    const hasEvidence = attempts > 0;
    return {
      topicId: row.topic,
      subjectKey: row.subject,
      syllabusId: row.syllabus_id,
      curriculumTopicKey: row.curriculum_topic_key,
      // topic_mastery may contain default placeholder values before any attempt.
      // Never expose those placeholders as measured student mastery.
      masteryScore: hasEvidence && typeof row.mastery_score === "number" ? row.mastery_score : null,
      attempts,
      retention: hasEvidence && typeof row.retention === "number" ? row.retention : null,
      confidence: hasEvidence && typeof row.confidence === "number" ? row.confidence : null,
      stability: hasEvidence && typeof row.stability === "number" ? row.stability : null,
      errorRate: hasEvidence && typeof row.error_rate === "number" ? row.error_rate : null,
      uncertainty: hasEvidence && typeof row.uncertainty === "number" ? row.uncertainty : null,
      lastObservedAt: hasEvidence ? row.last_attempted : null,
      evidenceState: hasEvidence ? "available" : "insufficient_evidence",
      source: "topic_mastery",
    };
  });
  const evidenceCount = topics.reduce((count, item) => count + item.attempts, 0);
  const mistakeEvents = mistakeEventsResult.data ?? [];
  const repeatedTopicErrors = deriveRepeatedTopicErrors(mistakeEvents);
  const recurringMistakes = deriveRecurringMistakes(mistakeEvents);
  const spacedRetrieval = deriveSpacedRetrievalEvidence(mistakeEvents);
  const reviewSuggestions = deriveEvidenceBasedReviewSuggestions({
    repeatedTopicErrors,
    recurringMistakes,
    spacedRetrieval,
  });

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    profile: {
      state: profileState,
      source: "profiles+cortex_memory",
      observedAt: memory?.updated_at ?? academicProfile?.created_at ?? null,
      level: academicProfile?.level ?? null,
      streak: memory?.current_streak ?? null,
      subjects: academicProfile?.subjects ?? [],
      studyLevel: academicProfile?.study_level ?? null,
      educationStage: academicProfile?.education_stage ?? null,
      curriculumDeclaration: academicProfile
        ? {
            board: academicProfile.curriculum_board ?? null,
            qualification: academicProfile.qualification ?? null,
            syllabusCode: academicProfile.syllabus_code ?? null,
            syllabusYear: academicProfile.syllabus_year ?? null,
            verified: false,
          }
        : null,
      frequentlyStudiedSubjects: memory?.frequently_studied_subjects ?? [],
      strongSubjects: memory?.strong_subjects ?? [],
      weakSubjects: memory?.weak_subjects ?? [],
      totalStudySessions: memory?.total_study_sessions ?? null,
      totalLessonsCompleted: memory?.total_lessons_completed ?? null,
      averageExamScore: memory?.average_exam_score ?? null,
    },
    topics: {
      state: evidenceCount > 0 ? "available" : "insufficient_evidence",
      source: "topic_mastery",
      evidenceCount,
      items: topics,
    },
    mistakes: {
      state: repeatedTopicErrors.length > 0 || recurringMistakes.length > 0 ? "available" : "insufficient_evidence",
      source: "cortex_events",
      inspectedEventCount: mistakeEvents.length,
      repeatedTopicErrors,
      recurringMistakes,
    },
    spacedRetrieval: {
      state: spacedRetrieval.length > 0 ? "available" : "insufficient_evidence",
      source: "cortex_events",
      inspectedEventCount: mistakeEvents.length,
      topics: spacedRetrieval,
      interpretation: "descriptive_only",
    },
    reviewSuggestions: {
      state: reviewSuggestions.length > 0 ? "available" : "insufficient_evidence",
      source: "cortex_events",
      items: reviewSuggestions,
      interpretation: "evidence_backed_no_due_dates",
    },
  };
}
