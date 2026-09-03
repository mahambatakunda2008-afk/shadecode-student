const STORAGE_KEY = "shadecode:webmcp:study-state";

export type StudyState = {
  goal?: string;
  subject?: string;
  availableMinutes?: number;
  plan?: {
    subject: string;
    topic: string;
    steps: string[];
    stepMinutes?: number[];
    minutes?: number;
    phase?: string;
    successCriteria?: string;
    nextAction?: string;
    createdAt: string;
  };
  activeSession?: {
    subject: string;
    topic: string;
    minutes: number;
    startedAt: string;
    stepIndex?: number;
  } | null;
  lastCompletion?: {
    outcome: string;
    mastery?: number;
    completedAt: string;
    session: StudyState["activeSession"];
    recommendation?: string;
  };
  updatedAt?: string;
};

export type StudyStateWithGuidance = StudyState & {
  status: "idle" | "planned" | "active" | "completed";
  elapsedMinutes?: number;
  remainingMinutes?: number;
  recommendedNextAction: string;
};

const SUBJECT_ALIASES: Record<string, string> = {
  p: "Physics",
  phys: "Physics",
  physics: "Physics",
  m: "Mathematics",
  maths: "Mathematics",
  math: "Mathematics",
  cs: "Computer Science",
  comp sci: "Computer Science",
  computer science: "Computer Science",
  chem: "Chemistry",
  chemistry: "Chemistry",
  bio: "Biology",
  biology: "Biology",
  econ: "Economics",
  economics: "Economics",
};

function assertBrowser() {
  if (typeof window === "undefined") throw new Error("Study capabilities require a browser context");
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  return text || undefined;
}

function normalizeSubject(value: unknown): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;
  return SUBJECT_ALIASES[text.toLowerCase()] ?? text;
}

function isGarbageTopic(value: unknown): boolean {
  const text = cleanText(value);
  if (!text) return true;
  if (text.length < 2) return true;
  if (/^(study session|general study|focused study)$/i.test(text)) return true;
  return false;
}

function sanitizeState(state: StudyState): StudyState {
  const subject = normalizeSubject(state.subject);
  const plan = state.plan && !isGarbageTopic(state.plan.topic)
    ? { ...state.plan, subject: normalizeSubject(state.plan.subject) ?? state.plan.subject, topic: cleanText(state.plan.topic) ?? state.plan.topic }
    : undefined;
  const activeSession = state.activeSession && !isGarbageTopic(state.activeSession.topic)
    ? { ...state.activeSession, subject: normalizeSubject(state.activeSession.subject) ?? state.activeSession.subject, topic: cleanText(state.activeSession.topic) ?? state.activeSession.topic }
    : null;
  return {
    ...state,
    goal: cleanText(state.goal),
    subject,
    plan,
    activeSession,
  };
}

export function getStudyState(): StudyState {
  assertBrowser();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const state = raw ? sanitizeState(JSON.parse(raw) as StudyState) : {};
    if (raw && JSON.stringify(state) !== raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    return state;
  } catch {
    return {};
  }
}

function saveStudyState(patch: Partial<StudyState>): StudyState {
  assertBrowser();
  const next = sanitizeState({ ...getStudyState(), ...patch, updatedAt: new Date().toISOString() });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("shadecode:study-state", { detail: next }));
  return next;
}

function boundedMinutes(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(24 * 60, Math.round(value)));
}

function normalizeSteps(steps: string[], topic: string): string[] {
  const clean = steps.map((step) => step.trim()).filter((step) => step.length >= 3).slice(0, 8);
  if (clean.length > 0) return clean;
  return [
    `Quick diagnostic: recall what you already know about ${topic}`,
    `Learn the core ideas of ${topic} and check one worked example`,
    `Practise targeted ${topic} questions without notes`,
    `Mark mistakes, correct them, and write the next weak point`,
    `Finish with a short exam-style retrieval check on ${topic}`,
  ];
}

function allocateMinutes(total: number, count: number): number[] {
  const base = Math.max(1, Math.floor(total / count));
  const result = Array.from({ length: count }, () => base);
  let remainder = total - base * count;
  const weights = [1, 3, 2.5, 2.5, 1];
  while (remainder > 0) {
    const index = result.map((minutes, i) => ({ i, score: minutes / (weights[i] ?? 2) })).sort((a, b) => a.score - b.score)[0].i;
    result[index] += 1;
    remainder -= 1;
  }
  return result;
}

function guidance(state: StudyState): StudyStateWithGuidance {
  const active = state.activeSession;
  if (active) {
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 60000));
    const remaining = Math.max(0, active.minutes - elapsed);
    return {
      ...state,
      status: "active",
      elapsedMinutes: elapsed,
      remainingMinutes: remaining,
      recommendedNextAction: remaining > 0
        ? `Continue ${active.topic}; work the current plan step, then check your understanding before moving on.`
        : `Your planned ${active.minutes}-minute session is due to finish. Complete a quick retrieval check and record mastery.`,
    };
  }
  if (state.plan) {
    return {
      ...state,
      status: state.lastCompletion ? "completed" : "planned",
      recommendedNextAction: state.plan.nextAction || `Start ${state.plan.subject} on ${state.plan.topic} for ${state.plan.minutes ?? 25} minutes.`,
    };
  }
  if (state.lastCompletion) {
    return {
      ...state,
      status: "completed",
      recommendedNextAction: state.lastCompletion.recommendation || "Set the next concrete study goal while the session is still fresh.",
    };
  }
  return {
    ...state,
    status: "idle",
    recommendedNextAction: "Set one concrete study outcome and the time you have available.",
  };
}

export function getStudyStateForAgent(): StudyStateWithGuidance {
  return guidance(getStudyState());
}

export function setStudyGoal(input: { goal: string; subject?: string; minutes?: number }): StudyStateWithGuidance {
  const goal = cleanText(input.goal);
  if (!goal || goal.length < 3) throw new Error("Tell Cortex what you actually want to achieve, not just a letter or fragment.");
  saveStudyState({
    goal,
    subject: normalizeSubject(input.subject),
    availableMinutes: input.minutes === undefined ? undefined : boundedMinutes(input.minutes, 25),
  });
  return getStudyStateForAgent();
}

export function createStudyPlan(input: { subject: string; topic: string; steps?: string[]; minutes?: number; goal?: string }): StudyStateWithGuidance {
  const subject = normalizeSubject(input.subject);
  const topic = cleanText(input.topic);
  if (!subject || !topic || isGarbageTopic(topic)) throw new Error("I need a real subject and topic before I create a study plan.");
  const minutes = boundedMinutes(input.minutes, getStudyState().availableMinutes ?? 30);
  const steps = normalizeSteps(input.steps ?? [], topic);
  const stepMinutes = allocateMinutes(minutes, steps.length);
  const goal = cleanText(input.goal) || getStudyState().goal || `Make measurable progress on ${topic}`;
  const plan = {
    subject,
    topic,
    steps,
    stepMinutes,
    minutes,
    phase: "diagnose → learn → practise → correct → retrieve",
    successCriteria: `Explain the core idea, complete targeted questions, and identify what still needs work in ${topic}.`,
    nextAction: `Start with step 1: ${steps[0]} (${stepMinutes[0]} min).`,
    createdAt: new Date().toISOString(),
  };
  saveStudyState({ goal, subject, availableMinutes: minutes, plan });
  return getStudyStateForAgent();
}

export function startStudySession(input: { subject?: string; topic?: string; minutes?: number }): StudyStateWithGuidance {
  const current = getStudyState();
  const subject = normalizeSubject(input.subject) || current.plan?.subject || current.subject;
  const requestedTopic = cleanText(input.topic);
  const topic = requestedTopic && !isGarbageTopic(requestedTopic) ? requestedTopic : current.plan?.topic;
  if (!subject || !topic) throw new Error("I need a real subject and topic, or a saved study plan first.");
  const minutes = boundedMinutes(input.minutes, current.plan?.minutes ?? current.availableMinutes ?? 25);
  saveStudyState({
    subject,
    activeSession: { subject, topic, minutes, startedAt: new Date().toISOString(), stepIndex: 0 },
    plan: current.plan ? { ...current.plan, nextAction: `Work step 1: ${current.plan.steps[0]}${current.plan.stepMinutes?.[0] ? ` (${current.plan.stepMinutes[0]} min)` : ""}.` } : current.plan,
  });
  return getStudyStateForAgent();
}

export function finishStudySession(input: { outcome?: string; mastery?: number }): StudyStateWithGuidance {
  const state = getStudyState();
  const mastery = input.mastery === undefined ? undefined : Math.max(0, Math.min(100, Math.round(input.mastery)));
  const recommendation = mastery === undefined
    ? "Review the session outcome, then set a mastery score or continue with the next weak point."
    : mastery < 60
      ? "Re-teach the weakest concept and practise a smaller set of easier questions before another exam attempt."
      : mastery < 80
        ? "Target the mistakes from this session with another focused practice block, then retry exam-style questions."
        : "Move to exam-style retrieval or a timed past-paper section to test whether the knowledge holds under pressure.";
  saveStudyState({
    activeSession: null,
    lastCompletion: {
      outcome: cleanText(input.outcome) || "Session completed",
      mastery,
      completedAt: new Date().toISOString(),
      session: state.activeSession ?? null,
      recommendation,
    },
    plan: state.plan ? { ...state.plan, nextAction: recommendation } : state.plan,
  });
  return getStudyStateForAgent();
}

export function buildStudyCapabilities() {
  return {
    get_student_study_state: getStudyStateForAgent,
    set_study_goal: setStudyGoal,
    create_study_plan: createStudyPlan,
    start_study_session: startStudySession,
    finish_study_session: finishStudySession,
    setStudyGoal,
    createStudyPlan,
    startStudySession,
    finishStudySession,
  };
}
