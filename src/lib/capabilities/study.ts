const STORAGE_KEY = "shadecode:webmcp:study-state";

export type StudyState = {
  goal?: string;
  subject?: string;
  availableMinutes?: number;
  plan?: {
    subject: string;
    topic: string;
    steps: string[];
    minutes?: number;
    createdAt: string;
  };
  activeSession?: {
    subject: string;
    topic: string;
    minutes: number;
    startedAt: string;
  } | null;
  lastCompletion?: {
    outcome: string;
    mastery?: number;
    completedAt: string;
    session: StudyState["activeSession"];
  };
  updatedAt?: string;
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

export function setStudyGoal(input: { goal: string; subject?: string; minutes?: number }): StudyState {
  const goal = input.goal.trim();
  if (!goal) throw new Error("goal is required");
  return saveStudyState({
    goal,
    subject: input.subject?.trim() || undefined,
    availableMinutes: input.minutes === undefined ? undefined : boundedMinutes(input.minutes, 25),
  });
}

export function createStudyPlan(input: {
  subject: string;
  topic: string;
  steps: string[];
  minutes?: number;
}): StudyState {
  const subject = input.subject.trim();
  const topic = input.topic.trim();
  const steps = input.steps.map((step) => step.trim()).filter(Boolean).slice(0, 20);
  if (!subject || !topic || steps.length === 0) throw new Error("subject, topic and at least one step are required");
  return saveStudyState({
    plan: { subject, topic, steps, minutes: input.minutes === undefined ? undefined : boundedMinutes(input.minutes, 25), createdAt: new Date().toISOString() },
  });
}

export function startStudySession(input: { subject: string; topic: string; minutes?: number }): StudyState {
  const subject = input.subject.trim();
  const topic = input.topic.trim();
  if (!subject || !topic) throw new Error("subject and topic are required");
  return saveStudyState({
    activeSession: { subject, topic, minutes: boundedMinutes(input.minutes, 25), startedAt: new Date().toISOString() },
  });
}

export function finishStudySession(input: { outcome?: string; mastery?: number }): StudyState {
  const state = getStudyState();
  const mastery = input.mastery === undefined ? undefined : Math.max(0, Math.min(100, Math.round(input.mastery)));
  return saveStudyState({
    activeSession: null,
    lastCompletion: {
      outcome: input.outcome?.trim() || "Session completed",
      mastery,
      completedAt: new Date().toISOString(),
      session: state.activeSession ?? null,
    },
  });
}

export function buildStudyCapabilities() {
  return {
    get_student_study_state: () => getStudyState(),
    set_study_goal: setStudyGoal,
    create_study_plan: createStudyPlan,
    start_study_session: startStudySession,
    finish_study_session: finishStudySession,
  };
}
