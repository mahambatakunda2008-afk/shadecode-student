import { afterEach, describe, expect, it, vi } from "vitest";
import { readVerifyLearnerModel, recordVerifyLearningSignal } from "./learner-model-store";

function installStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  });
}

describe("Cortex Verify learner model storage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("isolates learning evidence between signed-in student accounts", () => {
    installStorage();
    recordVerifyLearningSignal("student-a", {
      subject: "Mathematics", topic: "Algebra", score: 35, misconceptionTags: ["Sign error"],
    });
    recordVerifyLearningSignal("student-b", {
      subject: "Physics", topic: "Waves", score: 90,
    });

    expect(readVerifyLearnerModel("student-a").topics.map(item => item.subject)).toEqual(["Mathematics"]);
    expect(readVerifyLearnerModel("student-b").topics.map(item => item.subject)).toEqual(["Physics"]);
  });

  it("does not read or write learner data without an authenticated account id", () => {
    installStorage();
    const before = readVerifyLearnerModel("");
    const after = recordVerifyLearningSignal("", { subject: "Mathematics", topic: "Algebra", score: 50 });
    expect(before.topics).toEqual([]);
    expect(after.topics).toEqual([]);
  });
});
