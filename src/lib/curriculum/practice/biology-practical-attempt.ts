export type PracticeSkillRating = "secure" | "developing" | "revisit";

export interface PracticalQuestion {
  id: string;
  marks: number;
  prompt: string;
  answer: string[];
}

export interface PracticalTask {
  id: string;
  title: string;
  paper: "Paper 3" | "Paper 5";
  skills: string[];
  questions: PracticalQuestion[];
}

export interface PracticalPracticeSet {
  id: string;
  status: string;
  publicationStatus: string;
  tasks: PracticalTask[];
}

export interface PracticalAttempt {
  practiceSetId: string;
  startedAt: string;
  answers: Record<string, string>;
  revealedAnswers: string[];
  skillRatings: Record<string, PracticeSkillRating>;
  selfAwardedMarks: Record<string, number>;
}

export interface SkillReview {
  skill: string;
  rating: PracticeSkillRating | "not-reviewed";
  taskIds: string[];
}

export interface PracticalAttemptSummary {
  answeredQuestions: number;
  totalQuestions: number;
  revealedQuestions: number;
  selfAwardedMarks: number;
  availableMarks: number;
  skills: SkillReview[];
  skillsToRevisit: string[];
}

export function canAttemptPracticalSet(set: PracticalPracticeSet): boolean {
  return set.status === "draft" && set.publicationStatus === "unpublished";
}

export function startPracticalAttempt(
  set: PracticalPracticeSet,
  startedAt = new Date().toISOString(),
): PracticalAttempt {
  if (!canAttemptPracticalSet(set)) {
    throw new Error("Only explicitly draft, unpublished practical sets can be attempted through this preview engine.");
  }

  return {
    practiceSetId: set.id,
    startedAt,
    answers: {},
    revealedAnswers: [],
    skillRatings: {},
    selfAwardedMarks: {},
  };
}

export function savePracticalAnswer(
  set: PracticalPracticeSet,
  attempt: PracticalAttempt,
  taskId: string,
  questionId: string,
  answer: string,
): PracticalAttempt {
  const question = findQuestion(set, taskId, questionId);
  if (!question) throw new Error("Question not found in this practical set.");

  return {
    ...attempt,
    answers: { ...attempt.answers, [questionKey(taskId, questionId)]: answer },
  };
}

export function revealPracticalGuidance(
  set: PracticalPracticeSet,
  attempt: PracticalAttempt,
  taskId: string,
  questionId: string,
): PracticalAttempt {
  if (!findQuestion(set, taskId, questionId)) {
    throw new Error("Question not found in this practical set.");
  }

  const key = questionKey(taskId, questionId);
  return {
    ...attempt,
    revealedAnswers: attempt.revealedAnswers.includes(key)
      ? attempt.revealedAnswers
      : [...attempt.revealedAnswers, key],
  };
}

export function ratePracticalSkill(
  set: PracticalPracticeSet,
  attempt: PracticalAttempt,
  taskId: string,
  skill: string,
  rating: PracticeSkillRating,
): PracticalAttempt {
  const task = set.tasks.find((item) => item.id === taskId);
  if (!task || !task.skills.includes(skill)) {
    throw new Error("Skill is not part of this practical task.");
  }

  return {
    ...attempt,
    skillRatings: { ...attempt.skillRatings, [skillKey(taskId, skill)]: rating },
  };
}

export function selfAwardPracticalMarks(
  set: PracticalPracticeSet,
  attempt: PracticalAttempt,
  taskId: string,
  questionId: string,
  marks: number,
): PracticalAttempt {
  const question = findQuestion(set, taskId, questionId);
  if (!question) throw new Error("Question not found in this practical set.");
  if (!Number.isInteger(marks) || marks < 0 || marks > question.marks) {
    throw new Error(`Self-awarded marks must be an integer from 0 to ${question.marks}.`);
  }

  return {
    ...attempt,
    selfAwardedMarks: {
      ...attempt.selfAwardedMarks,
      [questionKey(taskId, questionId)]: marks,
    },
  };
}

export function summarizePracticalAttempt(
  set: PracticalPracticeSet,
  attempt: PracticalAttempt,
): PracticalAttemptSummary {
  const questions = set.tasks.flatMap((task) =>
    task.questions.map((question) => ({ task, question })),
  );
  const skills = new Map<string, { rating: PracticeSkillRating | "not-reviewed"; taskIds: string[] }>();

  for (const task of set.tasks) {
    for (const skill of task.skills) {
      const key = skillKey(task.id, skill);
      const existing = skills.get(key);
      if (!existing) {
        skills.set(key, { rating: attempt.skillRatings[key] ?? "not-reviewed", taskIds: [task.id] });
      }
    }
  }

  const skillReviews = [...skills.entries()].map(([key, value]) => ({
    skill: key.slice(key.indexOf("::") + 2),
    rating: value.rating,
    taskIds: value.taskIds,
  }));

  return {
    answeredQuestions: questions.filter(({ task, question }) =>
      Boolean(attempt.answers[questionKey(task.id, question.id)]?.trim()),
    ).length,
    totalQuestions: questions.length,
    revealedQuestions: attempt.revealedAnswers.length,
    selfAwardedMarks: Object.values(attempt.selfAwardedMarks).reduce((sum, value) => sum + value, 0),
    availableMarks: questions.reduce((sum, { question }) => sum + question.marks, 0),
    skills: skillReviews,
    skillsToRevisit: skillReviews
      .filter((item) => item.rating === "revisit" || item.rating === "not-reviewed")
      .map((item) => item.skill),
  };
}

function findQuestion(set: PracticalPracticeSet, taskId: string, questionId: string) {
  return set.tasks.find((task) => task.id === taskId)?.questions.find((question) => question.id === questionId);
}

function questionKey(taskId: string, questionId: string): string {
  return `${taskId}::${questionId}`;
}

function skillKey(taskId: string, skill: string): string {
  return `${taskId}::${skill}`;
}
