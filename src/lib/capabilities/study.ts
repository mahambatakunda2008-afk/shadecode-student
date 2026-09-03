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

function assertBrowser() {
  if (typeof window === "undefined") throw new Error("Study capabilities require a browser context");
}

export function getStudyState(): StudyState {
  assertBrowser();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StudyState) : {};
  } catch {
    return {};
  }
}

function saveStudyState(patch: Partial<StudyState>): StudyState {
  assertBrowser();
  const next = { ...getStudyState(), ...patch, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("shadecode:study-state", { detail: next }));
  return next;
}

function boundedMinutes(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(24 * 60, Math.round(value)));
}

function normalizeSteps(steps: string[], topic: string): string[] {
  const clean = steps.map((step) => step.trim()).filter(Boolean).slice(0, 8);
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
  if (count === 1) return [total];
  const weights = [0.1, 0.3, 0.25, 0.25, 0.1].slice(0, count);
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((weight) => Math.max(3, Math.round((total * weight) / sum)));
  const delta = total - raw.reduce((a, b) => a + b, 0);
  raw[raw.length - 1] = Math.max(1, raw[raw.length - 1] + delta);
  return raw;
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
  const goal = input.goal.trim();
  if (!goal) throw new Error("goal is required");
  saveStudyState({
    goal,
    subject: input.subject?.trim() || undefined,
    availableMinutes: input.minutes === undefined ? undefined : boundedMinutes(input.minutes, 25),
  });
  return getStudyStateForAgent();
}

export function createStudyPlan(input: {
  subject: string;
  topic: string;
  steps?: string[];
  minutes?: number;
  goal?: string;
}): StudyStateWithGuidance {
  const subject = input.subject.trim();
  const topic = input.topic.trim();
  if (!subject || !topic) throw new Error("subject and topic are required");
  const minutes = boundedMinutes(input.minutes, getStudyState().availableMinutes ?? 30);
  const steps = normalizeSteps(input.steps ?? [], topic);
  const stepMinutes = allocateMinutes(minutes, steps.length);
  const goal = input.goal?.trim() || getStudyState().goal || `Make measurable progress on ${topic}`;
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
  const subject = input.subject?.trim() || current.plan?.subject || current.subject;
  const topic = input.topic?.trim() || current.plan?.topic;
  if (!subject || !topic) throw new Error("subject and topic are required, or create a study plan first");
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
      outcome: input.outcome?.trim() || "Session completed",
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
