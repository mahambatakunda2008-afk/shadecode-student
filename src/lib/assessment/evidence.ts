import type { AssessmentType } from "@/lib/academic/context";

/**
 * Evidence produced by an assessment attempt.
 *
 * This is a domain contract only. It deliberately has no persistence code so
 * existing exam, past-paper and future tertiary assessment producers can adopt
 * it incrementally without creating a second database model prematurely.
 */
export type AssessmentSource =
  | "past_paper"
  | "exam_simulation"
  | "teacher_assessment"
  | "student_self_assessment"
  | "ai_generated";

export interface AssessmentContextRef {
  assessmentId?: string;
  assessmentType: AssessmentType;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  periodId?: string;
  qualificationId?: string;
  syllabusId?: string;
  board?: string;
  paperId?: string;
  year?: number;
  session?: string;
}

export interface AssessmentQuestionEvidence {
  questionId: string | number;
  questionType?: string;
  topic?: string;
  topicId?: string;
  maxMarks: number;
  awardedMarks: number;
  percentage: number;
  correct?: boolean;
  studentAnswer?: string;
  feedback?: string;
  modelAnswer?: string;
  timeSpentSeconds?: number;
}

export interface AssessmentEvidence {
  id: string;
  learnerId: string;
  source: AssessmentSource;
  context: AssessmentContextRef;
  attemptedAt: string;
  totalMarks: number;
  awardedMarks: number;
  percentage: number;
  grade?: string;
  questions: AssessmentQuestionEvidence[];
  provenance?: {
    documentId?: string;
    documentPath?: string;
    sourceDocument?: string;
    verified?: boolean;
  };
}

export function buildAssessmentEvidence(input: {
  id: string;
  learnerId: string;
  source: AssessmentSource;
  context: AssessmentContextRef;
  attemptedAt: string;
  questions: AssessmentQuestionEvidence[];
  grade?: string;
  provenance?: AssessmentEvidence["provenance"];
}): AssessmentEvidence {
  const totalMarks = input.questions.reduce((sum, question) => sum + Math.max(0, question.maxMarks), 0);
  const awardedMarks = input.questions.reduce(
    (sum, question) => sum + Math.max(0, Math.min(question.awardedMarks, question.maxMarks)),
    0
  );

  return {
    id: input.id,
    learnerId: input.learnerId,
    source: input.source,
    context: input.context,
    attemptedAt: input.attemptedAt,
    totalMarks,
    awardedMarks,
    percentage: totalMarks > 0 ? Math.round((awardedMarks / totalMarks) * 100) : 0,
    grade: input.grade,
    questions: input.questions,
    provenance: input.provenance,
  };
}
