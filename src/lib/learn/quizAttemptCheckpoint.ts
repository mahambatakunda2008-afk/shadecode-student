import { localFirstStore } from "@/lib/local-first/store";

export interface SafeQuizQuestion {
  id: number | string;
  question: string;
  options: string[];
  explanation: string;
}

export interface QuizAttemptCheckpoint {
  attemptId: string;
  lessonId: string;
  questions: SafeQuizQuestion[];
  answers: number[];
  current: number;
  selected: number | null;
  confirmed: boolean;
  updatedAt: string;
}

const checkpointId = (userId: string, lessonId: string) =>
  `quiz_attempt_checkpoint:${userId}:${lessonId}`;

function safeQuestions(value: unknown): SafeQuizQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const question = item as Record<string, unknown>;
    if (
      (typeof question.id !== "string" && typeof question.id !== "number") ||
      typeof question.question !== "string" ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      !question.options.every((option) => typeof option === "string")
    ) return [];
    return [{
      id: question.id,
      question: question.question,
      options: question.options as string[],
      explanation: typeof question.explanation === "string" ? question.explanation : "",
    }];
  });
}

export async function saveQuizAttemptCheckpoint(
  userId: string,
  checkpoint: QuizAttemptCheckpoint,
): Promise<void> {
  if (!userId || !checkpoint.lessonId || !checkpoint.attemptId) {
    throw new Error("Quiz checkpoint requires an authenticated learner and attempt");
  }
  const questions = safeQuestions(checkpoint.questions);
  if (!questions.length || questions.length !== checkpoint.questions.length) {
    throw new Error("Quiz checkpoint contains invalid questions");
  }
  if (!Array.isArray(checkpoint.answers) || checkpoint.answers.some((answer) =>
    !Number.isInteger(answer) || answer < 0 || answer > 3
  )) {
    throw new Error("Quiz checkpoint contains invalid answers");
  }
  if (!Number.isInteger(checkpoint.current) || checkpoint.current < 0 || checkpoint.current >= questions.length) {
    throw new Error("Quiz checkpoint has an invalid question position");
  }
  if (checkpoint.selected !== null && (!Number.isInteger(checkpoint.selected) || checkpoint.selected < 0 || checkpoint.selected > 3)) {
    throw new Error("Quiz checkpoint has an invalid selected option");
  }

  await localFirstStore.upsert({
    id: checkpointId(userId, checkpoint.lessonId),
    entity: "study_state",
    userId,
    payload: { ...checkpoint, questions, updatedAt: new Date().toISOString() },
  });
}

export async function getQuizAttemptCheckpoint(
  userId: string,
  lessonId: string,
): Promise<QuizAttemptCheckpoint | null> {
  if (!userId || !lessonId) return null;
  const record = await localFirstStore.get<QuizAttemptCheckpoint>(checkpointId(userId, lessonId));
  if (!record || record.userId !== userId || record.deletedAt || !record.payload) return null;
  const checkpoint = record.payload;
  const questions = safeQuestions(checkpoint.questions);
  if (
    !checkpoint.attemptId ||
    checkpoint.lessonId !== lessonId ||
    !questions.length ||
    !Array.isArray(checkpoint.answers) ||
    !Number.isInteger(checkpoint.current) ||
    checkpoint.current < 0 ||
    checkpoint.current >= questions.length
  ) return null;
  return { ...checkpoint, questions };
}

export async function clearQuizAttemptCheckpoint(userId: string, lessonId: string): Promise<void> {
  if (!userId || !lessonId) return;
  await localFirstStore.remove({
    id: checkpointId(userId, lessonId),
    entity: "study_state",
    userId,
  });
}
