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
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}").goal).toBe("Master vectors");
  });

  it("normalizes and bounds plan input", () => {
    installStorage();

    const state = createStudyPlan({
      subject: " Physics ",
      topic: "  Vectors ",
      steps: [" Review ", "", " Practice ", ...Array.from({ length: 25 }, (_, i) => `Step ${i}`)],
      minutes: 9999,
    });

    expect(state.plan?.subject).toBe("Physics");
    expect(state.plan?.topic).toBe("Vectors");
    expect(state.plan?.steps.length).toBe(20);
    expect(state.plan?.steps[0]).toBe("Review");
    expect(state.plan?.minutes).toBe(1440);
  });

  it("rejects empty required fields", () => {
    installStorage();

    expect(() => setStudyGoal({ goal: "   " })).toThrow("goal is required");
    expect(() => createStudyPlan({ subject: "", topic: "Vectors", steps: ["Review"] })).toThrow();
    expect(() => startStudySession({ subject: "Physics", topic: "" })).toThrow();
  });

  it("records and completes an active session", () => {
    installStorage();

    const started = startStudySession({ subject: "Math", topic: "Trigonometry", minutes: 45 });
    expect(started.activeSession?.minutes).toBe(45);

    const finished = finishStudySession({ outcome: "Completed identities", mastery: 125 });
    expect(finished.activeSession).toBeNull();
    expect(finished.lastCompletion?.outcome).toBe("Completed identities");
    expect(finished.lastCompletion?.mastery).toBe(100);
    expect(finished.lastCompletion?.session?.topic).toBe("Trigonometry");
  });

  it("fails safely when browser storage cannot be read", () => {
    const storage = installStorage();
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    expect(getStudyState()).toEqual({});
  });
});
