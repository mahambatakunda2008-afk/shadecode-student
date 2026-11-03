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
  taskRatings: Record<string, PracticeSkillRating | "not-reviewed">;
  reviewedTaskCount: number;
  totalTaskCount: number;
}

export interface PracticalAttemptSummary {
  answeredQuestions: number;
  totalQuestions: number;
  revealedQuestions: number;
  selfAwardedMarks: number;
  availableMarks: number;
  skills: SkillReview[];
  skillsToRevisit: string[];
  recommendedPractice: PracticalPracticeRecommendation[];
}

export interface PracticalPracticeRecommendation {
  skill: string;
  rating: PracticeSkillRating | "not-reviewed";
  taskId: string;
  taskTitle: string;
  questionId: string;
  reason: string;
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
  const skills = new Map<string, {
    skill: string;
    taskIds: string[];
    taskRatings: Record<string, PracticeSkillRating | "not-reviewed">;
  }>();

  for (const task of set.tasks) {
    for (const skill of task.skills) {
      const normalizedSkill = normalizeSkill(skill);
      const existing = skills.get(normalizedSkill) ?? {
        skill,
        taskIds: [],
        taskRatings: {},
      };
      if (!existing.taskIds.includes(task.id)) existing.taskIds.push(task.id);
      existing.taskRatings[task.id] = attempt.skillRatings[skillKey(task.id, skill)] ?? "not-reviewed";
      skills.set(normalizedSkill, existing);
    }
  }

  const skillReviews: SkillReview[] = [...skills.values()].map((item) => {
    const ratings = Object.values(item.taskRatings);
    const reviewedRatings = ratings.filter((rating): rating is PracticeSkillRating => rating !== "not-reviewed");
    const rating: PracticeSkillRating | "not-reviewed" =
      reviewedRatings.length === 0
        ? "not-reviewed"
        : reviewedRatings.includes("revisit")
          ? "revisit"
          : reviewedRatings.includes("developing")
            ? "developing"
            : reviewedRatings.length === ratings.length
              ? "secure"
              : "developing";

    return {
      skill: item.skill,
      rating,
      taskIds: item.taskIds,
      taskRatings: item.taskRatings,
      reviewedTaskCount: reviewedRatings.length,
      totalTaskCount: ratings.length,
    };
  });

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
      .filter((item) => item.rating !== "secure")
      .map((item) => item.skill),
    recommendedPractice: recommendPracticalPractice(set, attempt, skillReviews),
  };
}

export function recommendPracticalPractice(
  set: PracticalPracticeSet,
  attempt: PracticalAttempt,
  skills: SkillReview[],
): PracticalPracticeRecommendation[] {
  const ratingPriority: Record<PracticeSkillRating | "not-reviewed", number> = {
    revisit: 0,
    developing: 1,
    "not-reviewed": 2,
    secure: 3,
  };

  return skills
    .filter((skill) => skill.rating !== "secure")
    .map((skill) => {
      const candidates = skill.taskIds
        .map((taskId, index) => {
          const task = set.tasks.find((item) => item.id === taskId);
          if (!task) return null;
          const taskRating = skill.taskRatings[taskId] ?? "not-reviewed";
          const unanswered = task.questions.find((question) =>
            !attempt.answers[questionKey(task.id, question.id)]?.trim(),
          );
          const question = unanswered ?? task.questions[0];
          if (!question) return null;
          return {
            task,
            question,
            taskRating,
            hasUnanswered: Boolean(unanswered),
            index,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const alternativeToRevisit = skill.rating === "revisit"
        ? candidates.filter((candidate) => candidate.taskRating !== "revisit")
        : candidates;
      const pool = alternativeToRevisit.length ? alternativeToRevisit : candidates;
      pool.sort((a, b) =>
        Number(b.hasUnanswered) - Number(a.hasUnanswered)
        || ratingPriority[a.taskRating] - ratingPriority[b.taskRating]
        || a.index - b.index,
      );
      const selected = pool[0];
      if (!selected) return null;

      const reason = selected.taskRating === "revisit"
        ? "Revisit this skill with another attempt."
        : selected.taskRating === "developing"
          ? "Strengthen a skill you rated as developing."
          : "This skill has not yet been reviewed across its practice tasks.";

      return {
        skill: skill.skill,
        rating: skill.rating,
        taskId: selected.task.id,
        taskTitle: selected.task.title,
        questionId: selected.question.id,
        reason,
      };
    })
    .filter((item): item is PracticalPracticeRecommendation => item !== null);
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

function normalizeSkill(skill: string): string {
  return skill.trim().toLowerCase().replace(/\\s+/g, " ");
}
