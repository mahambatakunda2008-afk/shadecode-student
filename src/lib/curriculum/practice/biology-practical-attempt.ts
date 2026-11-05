export type PracticeSkillRating = "secure" | "developing" | "revisit";

export type PracticalFeedbackCategory = "biological-knowledge" | "method-design" | "measurement" | "calculations" | "interpretation" | "evaluation";

export interface PracticalQuestionFeedback {
  category: PracticalFeedbackCategory;
  categoryLabel: string;
  improvementAdvice: string;
}

/** Deterministic coaching based on the question wording, not automated marking of learner text. */
export function getPracticalQuestionFeedback(question: Pick<PracticalQuestion, "prompt" | "answer">): PracticalQuestionFeedback {
  const text = `${question.prompt} ${question.answer.join(" ")}`.toLowerCase();
  if (/limitation|improvement|evaluate|reliab|validity|precaution|risk|safety/.test(text)) {
    return { category: "evaluation", categoryLabel: "Evaluation and reliability", improvementAdvice: "For every weakness, explain how it could affect the results, then pair it with a realistic improvement. For safety points, pair each hazard with a specific precaution." };
  }
  if (/calculate|calculation|percentage|magnification|mean|standard error|confidence interval|t-test|chi-squared|correlation|statistical/.test(text)) {
    return { category: "calculations", categoryLabel: "Calculations and processing", improvementAdvice: "Write the equation first, substitute values with units, show each step, then give a suitably rounded answer. Check conversions and whether the final quantity has units." };
  }
  if (/graph|table|trend|pattern|anomal|plot|axis|axes|present the data|variation between repeats/.test(text)) {
    return { category: "interpretation", categoryLabel: "Data presentation and interpretation", improvementAdvice: "Identify the variables and units, describe the overall pattern using data, and distinguish a supported trend from an explanation that the data cannot prove." };
  }
  if (/measure|measurement|microscope|drawing|scale bar|focus|calibrat|resolution|precision|readings|recording/.test(text)) {
    return { category: "measurement", categoryLabel: "Measurement and observation", improvementAdvice: "State the instrument or observation method, the quantity and unit, and how readings will be made consistently. Include calibration, precision or a repeatable drawing convention where relevant." };
  }
  if (/method|plan|procedure|apparatus|variable|control|repeat|range|interval|independent|dependent|describe how|investigation|experiment|precaution/.test(text)) {
    return { category: "method-design", categoryLabel: "Method design and technique", improvementAdvice: "Make the method repeatable: identify what changes and what is measured, explain how controls are maintained, specify a useful range and repeats, and give enough detail for another student to follow." };
  }
  return { category: "biological-knowledge", categoryLabel: "Biological knowledge", improvementAdvice: "Name the relevant biological structure or process, explain the mechanism using precise terms, and connect the explanation directly to the observation or context in the question." };
}


export interface PracticalQuestion {
  id: string;
  marks: number;
  prompt: string;
  answer: string[];
  data?: {
    columns: string[];
    rows: Array<Array<string | number>>;
  };
}

export interface PracticalTask {
  id: string;
  title: string;
  paper: "Paper 3" | "Paper 5";
  format?: string;
  scenario?: string;
  skills: string[];
  questions: PracticalQuestion[];
}

export interface PracticalPracticeSet {
  id: string;
  status: string;
  publicationStatus: string;
  tasks: PracticalTask[];
}

const PRACTICAL_SKILL_ALIASES: Record<string, string[]> = {
  repeat: ["repeats", "replication", "replicate", "replicates", "repeat each", "repeated"],
  replication: ["repeat", "repeats", "replicate", "replicates"],
  "independent and dependent variables": ["independent variable", "dependent variable", "variables"],
  variables: ["independent variable", "dependent variable", "variable"],
  "control of variables": ["control", "constant", "maintain", "keep the same", "standardise", "standardize"],
  controls: ["control", "constant", "maintain", "keep the same", "standardise", "standardize"],
  measurement: ["measure", "measuring", "readings", "precision", "measured"],
  "microscope use": ["microscope", "objective lens", "eyepiece", "focus", "illumination", "stage micrometer"],
  observation: ["observe", "observed", "observation", "specimen", "visible features"],
  "biological drawing": ["drawing", "draw", "outline", "label", "proportion", "shading", "ruled label"],
  magnification: ["magnification", "magnified", "image size", "actual size", "unit conversion"],
  "scale bar": ["scale bar", "scale information", "calibration", "calibrated"],
  graph: ["plot", "axis", "axes", "trend", "curve", "best-fit", "best fit", "graph"],
  graphing: ["graph", "plot", "axis", "axes", "trend", "curve", "best-fit", "best fit"],
  table: ["record", "recording", "raw data", "headings", "results table"],
  "raw data table": ["table", "record", "recording", "raw data", "headings", "columns"],
  "data table": ["table", "record", "recording", "raw data", "headings", "columns"],
  "risk assessment": ["risk", "hazard", "safety", "precaution"],
  "range and intervals": ["range", "interval", "values", "concentration", "temperature", "pH values", "wind speeds"],
  "prediction and hypothesis": ["prediction", "predict", "hypothesis"],
  "method design": ["method", "procedure", "plan", "repeatable", "apparatus"],
  "apparatus setup": ["apparatus", "setup", "set up", "assemble", "airtight", "seal"],
  timing: ["timing", "timer", "timed", "time taken", "sampling interval", "seconds", "minutes"],
  "rate calculation": ["rate", "calculate", "calculation", "per minute", "mean rate"],
  "percentage change": ["percentage change", "percentage increase", "percentage decrease", "change in mass"],
  "data processing": ["process", "calculate", "mean", "percentage", "statistical", "standard error"],
  anomalies: ["anomalous", "anomaly", "outlier", "variation"],
  conclusion: ["conclude", "conclusion", "results suggest", "results show", "trend suggests", "pattern suggests", "supported by the data"],
  interpretation: ["interpret", "interpretation", "trend", "pattern", "relationship", "association"],
  evaluation: ["evaluate", "evaluation", "limitation", "limitations", "improve", "improvement", "improvements", "weakness", "reliability", "validity"],
  "limitations and improvements": ["limitation", "limitations", "improvement", "improvements", "weakness"],
  "choose statistical test": ["statistical test", "chi-squared", "t-test", "spearman", "pearson"],
  "null hypothesis": ["null hypothesis", "hypothesis", "no significant difference"],
  "identify data type": ["data type", "continuous", "quantitative", "nominal", "frequency data"],
  "classify variables and data": ["data type", "continuous", "quantitative", "nominal", "frequency data", "variables"],
  "interpret probability": ["probability", "p < 0.05", "significance level", "statistically significant"],
  "interpret correlation": ["correlation", "monotonic", "association", "positive", "negative"],
  "chi-squared": ["chi-squared", "observed frequencies", "expected frequencies"],
  "t-test assumptions": ["t-test", "normally distributed", "normal distribution", "standard deviations", "independent samples"],
  "degrees of freedom": ["degrees of freedom", "df"],
  "confidence intervals": ["confidence interval", "confidence intervals", "95% confidence"],
  "calculate standard error": ["standard error", "se =", "square root of sample size"],
  "evaluate sampling": ["sampling", "randomly", "random selection", "representative", "independent sites", "biased"],
  "evaluate conclusion": ["evaluate", "conclusion", "causation", "cause", "evidence"],
};

function practicalSkillTerms(skill: string): string[] {
  const normalized = skill.toLowerCase().trim();
  const aliases = PRACTICAL_SKILL_ALIASES[normalized] ?? [];
  const terms = normalized.split(/[^a-z0-9]+/).filter((term) => term.length > 3).flatMap((term) => term.endsWith("s") ? [term, term.slice(0, -1)] : [term]);
  return [...new Set([...terms, ...aliases])];
}

/**
 * Curated mappings for the original 9700 practice bank. These are intentionally
 * explicit: generic words such as "data", "control" and "table" must not create
 * accidental skill associations merely because they appear in an answer point.
 */
const CURATED_PRACTICAL_QUESTION_SKILLS: Record<string, string[]> = {
  "P3-01::a": ["independent and dependent variables"],
  "P3-01::b": ["range and intervals"],
  "P3-01::c": ["control of variables"],
  "P3-01::d": ["repeats", "anomalies"],
  "P3-01::e": ["raw data table"],
  "P3-01::f": ["graph"],
  "P3-01::g": ["limitations and improvements", "control of variables"],
  "P3-01::h": ["conclusion"],
  "P3-02::a": ["magnification", "scale bar"],
  "P3-02::b": ["biological drawing"],
  "P3-02::c": ["observation", "biological drawing"],
  "P3-02::d": ["microscope use"],
  "P5-01::a": ["prediction and hypothesis"],
  "P5-01::b": ["variables"],
  "P5-01::c": ["method design", "replication", "controls"],
  "P5-01::d": ["controls"],
  "P5-01::e": ["risk assessment"],
  "P5-01::f": ["data processing"],
  "P5-01::g": ["graphing", "replication"],
  "P5-01::h": ["evaluation", "method design"],
  "P3-03::a": ["independent and dependent variables", "percentage change"],
  "P3-03::b": ["range and intervals"],
  "P3-03::c": ["control of variables"],
  "P3-03::d": ["repeats"],
  "P3-03::e": ["table", "percentage change"],
  "P3-03::f": ["percentage change"],
  "P3-03::g": ["graph", "interpretation"],
  "P3-03::h": ["evaluation"],
  "P3-04::a": ["independent and dependent variables", "timing"],
  "P3-04::b": ["range and intervals"],
  "P3-04::c": ["timing", "control of variables"],
  "P3-04::d": ["control of variables"],
  "P3-04::e": ["repeats"],
  "P3-04::f": ["rate calculation"],
  "P3-04::g": ["graph"],
  "P3-04::h": ["evaluation"],
  "P3-05::a": ["independent and dependent variables", "measurement", "rate calculation"],
  "P3-05::b": ["apparatus setup"],
  "P3-05::c": ["control of variables"],
  "P3-05::d": ["range and intervals", "measurement"],
  "P3-05::e": ["rate calculation", "measurement"],
  "P3-05::f": ["measurement"],
  "P3-05::g": ["independent and dependent variables", "control of variables"],
  "P3-05::h": ["evaluation", "apparatus setup"],
  "P5-02::a": ["identify data type", "choose statistical test"],
  "P5-02::b": ["calculate standard error"],
  "P5-02::c": ["confidence intervals"],
  "P5-02::d": ["null hypothesis", "degrees of freedom"],
  "P5-02::e": ["calculate standard error"],
  "P5-02::f": ["choose statistical test", "interpret probability"],
  "P5-02::g": ["evaluate conclusion"],
  "P5-02::h": ["calculate standard error"],
  "P5-03::a": ["classify variables and data", "choose statistical test", "t-test assumptions", "chi-squared", "interpret correlation"],
  "P5-03::b": ["state null hypothesis", "chi-squared"],
  "P5-03::c": ["state null hypothesis", "t-test assumptions"],
  "P5-03::d": ["choose statistical test", "interpret correlation"],
  "P5-03::e": ["interpret correlation"],
  "P5-03::f": ["evaluate sampling"],
  "P5-03::g": ["interpret probability"],
  "P5-03::h": ["calculate correlation coefficient", "interpret correlation"],
};

/** Return the deliberately curated skills for known bank questions, with a bounded fallback for new tasks. */
export function getPracticalQuestionSkills(
  task: Pick<PracticalTask, "skills"> & Partial<Pick<PracticalTask, "id">>,
  question: Pick<PracticalQuestion, "prompt" | "answer"> & Partial<Pick<PracticalQuestion, "id">>,
): string[] {
  if (task.id) {
    const curated = CURATED_PRACTICAL_QUESTION_SKILLS[`${task.id}::${question.id}`];
    if (curated) return curated.filter((skill) => task.skills.includes(skill));
  }

  const text = `${question.prompt} ${question.answer.join(" ")}`.toLowerCase();
  const genericTerms = new Set(["data", "table", "control", "controls", "variable", "variables", "method", "test", "result", "results", "standard"]);
  const ranked = task.skills.map((skill, index) => {
    const normalized = skill.toLowerCase().trim();
    const aliases = PRACTICAL_SKILL_ALIASES[normalized] ?? [];
    const terms = normalized.split(/[^a-z0-9]+/)
      .filter((term) => term.length > 3 && !genericTerms.has(term))
      .flatMap((term) => term.endsWith("s") ? [term, term.slice(0, -1)] : [term]);
    const matches = [...new Set([...terms, ...aliases])]
      .filter((term) => term.length > 3 && text.includes(term));
    return { skill, index, score: matches.length };
  }).filter((item) => item.score > 0);
  ranked.sort((a, b) => b.score - a.score || a.index - b.index);
  return ranked.slice(0, 5).map((item) => item.skill);
}

export interface PracticalAttempt {
  practiceSetId: string;
  startedAt: string;
  answers: Record<string, string>;
  revealedAnswers: string[];
  skillRatings: Record<string, PracticeSkillRating>;
  selfAwardedMarks: Record<string, number>;
  checkedAnswerPoints: Record<string, number[]>;
}

export type PracticalSkillDomain = "biological-understanding" | "experimental-technique" | "data-handling" | "evaluation" | "other";

export interface SkillReview {
  skill: string;
  domain: PracticalSkillDomain;
  improvementFocus: string;
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
  paperCoverage: Record<"Paper 3" | "Paper 5", PracticalPaperCoverage>;
  practiceReview: { answeredPercent: number; skillsReviewed: number; totalSkills: number; skillReviewPercent: number; checkedGuidancePoints: number; availableGuidancePoints: number; guidanceReviewPercent: number; status: "not-started" | "in-progress" | "reviewed" };
}

export interface PracticalPaperCoverage {
  taskCount: number;
  questionCount: number;
  answeredQuestions: number;
  availableMarks: number;
  selfAwardedMarks: number;
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
    checkedAnswerPoints: {},
  };
}

/** Restore only state that belongs to the current bank and still matches its question/skill schema. */
export function restorePracticalAttempt(set: PracticalPracticeSet, value: unknown): PracticalAttempt {
  const fallback = () => startPracticalAttempt(set);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback();
  const saved = value as Record<string, unknown>;
  if (saved.practiceSetId !== set.id) return fallback();
  // A damaged timestamp must not discard otherwise recoverable student work.
  const startedAt = typeof saved.startedAt === "string" && Number.isFinite(Date.parse(saved.startedAt))
    ? saved.startedAt
    : new Date().toISOString();
  const isRecord = (item: unknown): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item);
  const answers: Record<string, string> = {};
  const revealedAnswers: string[] = [];
  const skillRatings: Record<string, PracticeSkillRating> = {};
  const selfAwardedMarks: Record<string, number> = {};
  const checkedAnswerPoints: Record<string, number[]> = {};
  const questions = new Map<string, PracticalQuestion>();
  const skills = new Set<string>();
  for (const task of set.tasks) {
    for (const question of task.questions) questions.set(questionKey(task.id, question.id), question);
    for (const skill of task.skills) skills.add(skillKey(task.id, skill));
  }
  if (isRecord(saved.answers)) for (const [key, answer] of Object.entries(saved.answers)) {
    if (questions.has(key) && typeof answer === "string") answers[key] = answer.slice(0, 20000);
  }
  if (Array.isArray(saved.revealedAnswers)) for (const key of saved.revealedAnswers) {
    if (typeof key === "string" && questions.has(key) && !revealedAnswers.includes(key)) revealedAnswers.push(key);
  }
  if (isRecord(saved.skillRatings)) for (const [key, rating] of Object.entries(saved.skillRatings)) {
    if (skills.has(key) && (rating === "secure" || rating === "developing" || rating === "revisit")) skillRatings[key] = rating;
  }
  if (isRecord(saved.selfAwardedMarks)) for (const [key, marks] of Object.entries(saved.selfAwardedMarks)) {
    const question = questions.get(key);
    if (question && Number.isInteger(marks) && (marks as number) >= 0 && (marks as number) <= question.marks) selfAwardedMarks[key] = marks as number;
  }
  if (isRecord(saved.checkedAnswerPoints)) for (const [key, indices] of Object.entries(saved.checkedAnswerPoints)) {
    const question = questions.get(key);
    if (question && Array.isArray(indices)) {
      const valid = [...new Set(indices.filter((index): index is number => Number.isInteger(index) && index >= 0 && index < question.answer.length))];
      if (valid.length) checkedAnswerPoints[key] = valid;
    }
  }
  return { practiceSetId: set.id, startedAt, answers, revealedAnswers, skillRatings, selfAwardedMarks, checkedAnswerPoints };
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
    answers: { ...attempt.answers, [questionKey(taskId, questionId)]: answer.slice(0, 20000) },
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

export function togglePracticalAnswerPoint(
  set: PracticalPracticeSet,
  attempt: PracticalAttempt,
  taskId: string,
  questionId: string,
  pointIndex: number,
): PracticalAttempt {
  const question = findQuestion(set, taskId, questionId);
  if (!question) throw new Error("Question not found in this practical set.");
  if (!Number.isInteger(pointIndex) || pointIndex < 0 || pointIndex >= question.answer.length) {
    throw new Error("Self-check point does not exist for this question.");
  }
  const key = questionKey(taskId, questionId);
  const checked = attempt.checkedAnswerPoints?.[key] ?? [];
  const next = checked.includes(pointIndex)
    ? checked.filter((index) => index !== pointIndex)
    : [...checked, pointIndex];
  return {
    ...attempt,
    checkedAnswerPoints: { ...attempt.checkedAnswerPoints, [key]: next },
  };
}

export function retryPracticalQuestion(
  set: PracticalPracticeSet,
  attempt: PracticalAttempt,
  taskId: string,
  questionId: string,
): PracticalAttempt {
  if (!findQuestion(set, taskId, questionId)) {
    throw new Error("Question not found in this practical set.");
  }

  const key = questionKey(taskId, questionId);
  const { [key]: _answer, ...answers } = attempt.answers;
  const { [key]: _marks, ...selfAwardedMarks } = attempt.selfAwardedMarks;
  const { [key]: _checked, ...checkedAnswerPoints } = attempt.checkedAnswerPoints ?? {};
  return {
    ...attempt,
    answers,
    selfAwardedMarks,
    checkedAnswerPoints,
    revealedAnswers: attempt.revealedAnswers.filter((item) => item !== key),
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

function validSelfAwardedMarks(attempt: PracticalAttempt, question: PracticalQuestion, key: string): number {
  const marks = attempt.selfAwardedMarks?.[key];
  return Number.isInteger(marks) && marks >= 0 && marks <= question.marks ? marks : 0;
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

    const domain = classifyPracticalSkill(item.skill);
    return {
      skill: item.skill,
      domain,
      improvementFocus: practicalSkillImprovementFocus(domain, rating),
      rating,
      taskIds: item.taskIds,
      taskRatings: item.taskRatings,
      reviewedTaskCount: reviewedRatings.length,
      totalTaskCount: ratings.length,
    };
  });

  const answeredQuestions = questions.filter(({ task, question }) =>
    Boolean(attempt.answers[questionKey(task.id, question.id)]?.trim()),
  ).length;
  const totalSkills = skills.size;
  const reviewedSkills = skillReviews.filter((item) => item.reviewedTaskCount === item.totalTaskCount).length;
  const revealedQuestionKeys = [...new Set(attempt.revealedAnswers)].filter((key) => {
    const [taskId, questionId] = key.split("::");
    return Boolean(findQuestion(set, taskId, questionId));
  });
  const availableGuidancePoints = revealedQuestionKeys.reduce((sum, key) => {
    const [taskId, questionId] = key.split("::");
    return sum + (findQuestion(set, taskId, questionId)?.answer.length ?? 0);
  }, 0);
  const checkedGuidancePoints = revealedQuestionKeys.reduce((sum, key) => {
    const [taskId, questionId] = key.split("::");
    const question = findQuestion(set, taskId, questionId);
    const validIndices = new Set(
      (attempt.checkedAnswerPoints?.[key] ?? []).filter((index) =>
        question && Number.isInteger(index) && index >= 0 && index < question.answer.length,
      ),
    );
    return sum + validIndices.size;
  }, 0);
  const practiceReview = {
    answeredPercent: questions.length ? Math.round((answeredQuestions / questions.length) * 100) : 0,
    skillsReviewed: reviewedSkills,
    totalSkills,
    skillReviewPercent: totalSkills ? Math.round((reviewedSkills / totalSkills) * 100) : 0,
    checkedGuidancePoints,
    availableGuidancePoints,
    guidanceReviewPercent: availableGuidancePoints ? Math.round((checkedGuidancePoints / availableGuidancePoints) * 100) : 0,
    status: (answeredQuestions === 0 && reviewedSkills === 0 && revealedQuestionKeys.length === 0
      ? "not-started"
      : answeredQuestions === questions.length && reviewedSkills === totalSkills &&
        revealedQuestionKeys.length > 0 && availableGuidancePoints > 0 &&
        checkedGuidancePoints === availableGuidancePoints
        ? "reviewed"
        : "in-progress") as "not-started" | "in-progress" | "reviewed",
  };

  return {
    answeredQuestions,
    totalQuestions: questions.length,
    revealedQuestions: revealedQuestionKeys.length,
    selfAwardedMarks: questions.reduce((sum, { task, question }) => sum + validSelfAwardedMarks(attempt, question, questionKey(task.id, question.id)), 0),
    availableMarks: questions.reduce((sum, { question }) => sum + question.marks, 0),
    skills: skillReviews,
    skillsToRevisit: skillReviews
      .filter((item) => item.rating !== "secure")
      .map((item) => item.skill),
    recommendedPractice: recommendPracticalPractice(set, attempt, skillReviews),
    paperCoverage: summarizePaperCoverage(set, attempt),
    practiceReview,
  };
}

export function summarizePaperCoverage(set: PracticalPracticeSet, attempt: PracticalAttempt): Record<"Paper 3" | "Paper 5", PracticalPaperCoverage> {
  const coverage: Record<"Paper 3" | "Paper 5", PracticalPaperCoverage> = {
    "Paper 3": { taskCount: 0, questionCount: 0, answeredQuestions: 0, availableMarks: 0, selfAwardedMarks: 0 },
    "Paper 5": { taskCount: 0, questionCount: 0, answeredQuestions: 0, availableMarks: 0, selfAwardedMarks: 0 },
  };
  for (const task of set.tasks) {
    const paper = coverage[task.paper];
    paper.taskCount += 1;
    for (const question of task.questions) {
      const key = questionKey(task.id, question.id);
      paper.questionCount += 1;
      paper.availableMarks += question.marks;
      if (attempt.answers[key]?.trim()) paper.answeredQuestions += 1;
      paper.selfAwardedMarks += validSelfAwardedMarks(attempt, question, key);
    }
  }
  return coverage;
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
          const relevantQuestions = task.questions
            .map((question, questionIndex) => ({ question, questionIndex }))
            .filter(({ question }) => {
              const mappedSkills = getPracticalQuestionSkills(task, question);
              return mappedSkills.some((mapped) => normalizeSkill(mapped) === normalizeSkill(skill.skill));
            });
          const questionPool = relevantQuestions.length
            ? relevantQuestions
            : task.questions.map((question, questionIndex) => ({ question, questionIndex }));
          const unanswered = questionPool.find(({ question }) =>
            !attempt.answers[questionKey(task.id, question.id)]?.trim(),
          );
          // When every relevant question has an answer, recommend the least-reviewed
          // one so the learner is sent to a useful retry rather than a completed first item.
          const leastReviewed = [...questionPool].sort((a, b) => {
            const aKey = questionKey(task.id, a.question.id);
            const bKey = questionKey(task.id, b.question.id);
            const aRevealed = attempt.revealedAnswers.includes(aKey);
            const bRevealed = attempt.revealedAnswers.includes(bKey);
            const aChecked = new Set(attempt.checkedAnswerPoints?.[aKey] ?? []).size;
            const bChecked = new Set(attempt.checkedAnswerPoints?.[bKey] ?? []).size;
            const aCoverage = aRevealed ? aChecked / Math.max(1, a.question.answer.length) : 0;
            const bCoverage = bRevealed ? bChecked / Math.max(1, b.question.answer.length) : 0;
            return aCoverage - bCoverage || aChecked - bChecked || a.questionIndex - b.questionIndex;
          })[0];
          const question = (unanswered ?? leastReviewed)?.question;
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
  return skill.trim().toLowerCase().replace(/\s+/g, " ");
}

function classifyPracticalSkill(skill: string): PracticalSkillDomain {
  const value = normalizeSkill(skill);
  if (/conclusion|limitation|improvement|evaluation|reliability|validity/.test(value)) return "evaluation";
  if (/graph|table|calculation|statistic|standard error|confidence interval|t-test|chi-squared|correlation|anomal|probability|null hypothesis|degrees of freedom|data type/.test(value)) return "data-handling";
  if (/osmosis|enzyme|catalase|amylase|photosynthesis|microscop|magnification|potometer|biological drawing|cell|membrane/.test(value)) return "biological-understanding";
  if (/variable|range|interval|repeat|control|risk|apparatus|measurement|sampling|method|procedure|dilution|timing|calibrat|independent|dependent/.test(value)) return "experimental-technique";
  return "other";
}

function practicalSkillImprovementFocus(domain: PracticalSkillDomain, rating: PracticeSkillRating | "not-reviewed"): string {
  const action = rating === "revisit"
    ? "Repeat a different task and explain each decision as you work."
    : rating === "developing"
      ? "Practise another task and check which steps you can complete independently."
      : "Complete a task in this area and record what you can do confidently.";
  const focus: Record<PracticalSkillDomain, string> = {
    "biological-understanding": "Strengthen the biological principle behind the observation, then connect it to the evidence.",
    "experimental-technique": "Practise choosing equipment, controlling variables and carrying out measurements consistently.",
    "data-handling": "Practise recording units and precision, processing results and selecting an appropriate presentation or test.",
    evaluation: "Practise linking each limitation to its effect on results and a realistic improvement.",
    other: "Practise the skill in a fresh context and explain the reasoning behind your method.",
  };
  return focus[domain] + " " + action;
}
