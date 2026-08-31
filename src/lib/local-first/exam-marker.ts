import type { ExamQuestion, ExamResult } from "@/components/exam/ExamWorkspace";

type MarkableQuestion = ExamQuestion & { modelAnswer?: string; markingCriteria?: string };
type Answer = { questionId: number; answer: string; timeSpent: number };

export interface LocalExamResults {
  totalScore: number;
  maxScore: number;
  percentage: number;
  grade: string;
  weakAreas: string[];
  strongAreas: string[];
  cortexInsight: string;
  results: ExamResult[];
  timeTaken: number;
  source: "local-deterministic";
}

function grade(p: number) {
  return p >= 90 ? "A*" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : p >= 40 ? "E" : "U";
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function findAnswer(answers: Answer[], id: number) {
  return answers.find((answer) => answer.questionId === id)?.answer ?? "";
}

/**
 * Marks only answers for which a deterministic decision is defensible.
 * MCQs use the stored model answer exactly. Other question types are not
 * guessed at: they receive zero only when blank, otherwise remain pending.
 */
export function markExamOffline(
  questions: ExamQuestion[],
  answers: Answer[],
  timeTaken: number,
): LocalExamResults {
  let totalScore = 0;
  let maxScore = 0;
  const results: ExamResult[] = [];
  const pendingTopics = new Set<string>();

  for (const question of questions as MarkableQuestion[]) {
    const answer = findAnswer(answers, question.id);
    const maxScoreForQuestion = Math.max(1, Math.round(Number(question.marks) || 1));
    maxScore += maxScoreForQuestion;

    if (!answer.trim()) {
      results.push({
        questionId: question.id,
        score: 0,
        maxScore: maxScoreForQuestion,
        correct: false,
        feedback: "No answer submitted.",
        modelAnswer: question.modelAnswer ?? "",
        topic: question.topic,
      });
      continue;
    }

    if (question.type === "multiple_choice" && question.modelAnswer) {
      const correct = normalize(answer) === normalize(question.modelAnswer);
      const score = correct ? maxScoreForQuestion : 0;
      totalScore += score;
      results.push({
        questionId: question.id,
        score,
        maxScore: maxScoreForQuestion,
        correct,
        feedback: correct ? "Correct." : "Incorrect. Review this question when connected for detailed feedback.",
        modelAnswer: question.modelAnswer,
        topic: question.topic,
      });
      continue;
    }

    pendingTopics.add(question.topic || "General");
    results.push({
      questionId: question.id,
      score: 0,
      maxScore: maxScoreForQuestion,
      correct: false,
      feedback: "Saved for marking. This answer needs examiner/Cortex evaluation for reliable partial credit.",
      modelAnswer: question.modelAnswer ?? "",
      topic: question.topic,
    });
  }

  const percentage = maxScore ? Math.round((totalScore / maxScore) * 100) : 0;
  const topicScores = new Map<string, { score: number; max: number }>();
  for (const result of results) {
    const key = result.topic || "General";
    const current = topicScores.get(key) ?? { score: 0, max: 0 };
    current.score += result.score;
    current.max += result.maxScore;
    topicScores.set(key, current);
  }
  const ranked = [...topicScores.entries()]
    .map(([topic, value]) => ({ topic, percentage: value.max ? Math.round((value.score / value.max) * 100) : 0 }))
    .sort((a, b) => b.percentage - a.percentage);

  return {
    totalScore,
    maxScore,
    percentage,
    grade: grade(percentage),
    weakAreas: [...pendingTopics, ...ranked.filter((item) => item.percentage < 50).map((item) => item.topic)].filter((item, index, all) => all.indexOf(item) === index).slice(0, 5),
    strongAreas: ranked.filter((item) => item.percentage >= 75).map((item) => item.topic).slice(0, 5),
    cortexInsight: pendingTopics.size
      ? "Your objective answers were marked locally. Written answers remain queued for deeper examiner/Cortex marking when available."
      : "Your objective answers were marked locally and are ready for review.",
    results,
    timeTaken: Math.max(0, Math.floor(timeTaken)),
    source: "local-deterministic",
  };
}
