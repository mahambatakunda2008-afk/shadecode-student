import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStudyPlan,
  finishStudySession,
  getStudyState,
  setStudyGoal,
  startStudySession,
} from "@/lib/capabilities/study";

const STORAGE_KEY = "shadecode:webmcp:study-state";

function installStorage() {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage,
      dispatchEvent: vi.fn(),
    },
  });
  return localStorage;
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis, "window");
});

describe("study capability layer", () => {
  it("starts empty and persists a study goal", () => {
    const storage = installStorage();
    expect(getStudyState()).toEqual({});
    const state = setStudyGoal({ goal: "Master vectors", subject: "Physics", minutes: 90 });
    expect(state.goal).toBe("Master vectors");
    expect(state.subject).toBe("Physics");
    expect(state.availableMinutes).toBe(90);
    expect(state.status).toBe("idle");
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}").goal).toBe("Master vectors");
  });

  it("builds a time-budgeted plan when the agent provides no steps", () => {
    installStorage();
    const state = createStudyPlan({ subject: "Physics", topic: "Mechanics", minutes: 60 });
    expect(state.status).toBe("planned");
    expect(state.plan?.steps.length).toBe(5);
    expect(state.plan?.stepMinutes?.length).toBe(5);
    expect(state.plan?.stepMinutes?.reduce((a, b) => a + b, 0)).toBe(60);
    expect(state.plan?.successCriteria).toContain("Mechanics");
    expect(state.recommendedNextAction).toContain("step 1");
  });

  it("normalizes and bounds supplied plan input", () => {
    installStorage();
    const state = createStudyPlan({
      subject: " Physics ",
      topic: "  Vectors ",
      steps: [" Review ", "", " Practice ", ...Array.from({ length: 25 }, (_, i) => `Step ${i}`)],
      minutes: 9999,
    });
    expect(state.plan?.subject).toBe("Physics");
    expect(state.plan?.topic).toBe("Vectors");
    expect(state.plan?.steps.length).toBe(8);
    expect(state.plan?.steps[0]).toBe("Review");
    expect(state.plan?.minutes).toBe(1440);
    expect(state.plan?.stepMinutes?.length).toBe(8);
    expect(state.plan?.stepMinutes?.reduce((a, b) => a + b, 0)).toBe(1440);
  });

  it("can start from the saved plan without reconstructing context", () => {
    installStorage();
    createStudyPlan({ subject: "Physics", topic: "Electricity", minutes: 30 });
    const started = startStudySession({});
    expect(started.status).toBe("active");
    expect(started.activeSession?.subject).toBe("Physics");
    expect(started.activeSession?.topic).toBe("Electricity");
    expect(started.activeSession?.stepIndex).toBe(0);
    expect(started.remainingMinutes).toBe(30);
  });

  it("rejects empty required fields", () => {
    installStorage();
    expect(() => setStudyGoal({ goal: "   " })).toThrow("goal is required");
    expect(() => createStudyPlan({ subject: "", topic: "Vectors" })).toThrow();
    expect(() => startStudySession({ subject: "Physics", topic: "" })).toThrow();
  });

  it("records completion and adapts to low mastery", () => {
    installStorage();
    startStudySession({ subject: "Math", topic: "Trigonometry", minutes: 45 });
    const finished = finishStudySession({ outcome: "Still confused by identities", mastery: 45 });
    expect(finished.activeSession).toBeNull();
    expect(finished.status).toBe("completed");
    expect(finished.lastCompletion?.mastery).toBe(45);
    expect(finished.lastCompletion?.recommendation).toContain("Re-teach");
    expect(finished.recommendedNextAction).toContain("Re-teach");
  });

  it("adapts high mastery toward exam retrieval", () => {
    installStorage();
    startStudySession({ subject: "Physics", topic: "Waves", minutes: 25 });
    const finished = finishStudySession({ outcome: "Strong session", mastery: 90 });
    expect(finished.lastCompletion?.recommendation).toContain("exam-style retrieval");
  });

  it("fails safely when browser storage cannot be read", () => {
    const storage = installStorage();
    vi.spyOn(storage, "getItem").mockImplementation(() => { throw new Error("storage unavailable"); });
    expect(getStudyState()).toEqual({});
  });
});
