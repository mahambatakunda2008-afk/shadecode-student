export interface MarkedLessonQuiz {
  correctCount: number;
  questionCount: number;
  score: number;
}

/**
 * Scores only against the trusted question snapshot loaded by the server.
 * Submitted answer objects are intentionally read for selectedIndex only.
 */
export function markLessonQuiz(questions: unknown, answers: unknown): MarkedLessonQuiz | null {
  if (!Array.isArray(questions) || !Array.isArray(answers) || questions.length < 1 || questions.length !== answers.length) return null;
  let correctCount = 0;
  for (let index = 0; index < questions.length; index++) {
    const question = questions[index] as { correctIndex?: unknown } | null;
    const answer = answers[index] as { selectedIndex?: unknown } | null;
    if (!question || !Number.isInteger(question.correctIndex) || (question.correctIndex as number) < 0 || (question.correctIndex as number) > 3) return null;
    if (!answer || !Number.isInteger(answer.selectedIndex) || (answer.selectedIndex as number) < 0 || (answer.selectedIndex as number) > 3) return null;
    if (answer.selectedIndex === question.correctIndex) correctCount++;
  }
  const questionCount = questions.length;
  return { correctCount, questionCount, score: Math.round((correctCount / questionCount) * 10000) / 100 };
}
