import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeVerifyIntervention, recordVerifyIntervention } from "./intervention-tracker";

function installStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  });
}

describe("Cortex Verify intervention tracking", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("links one help intervention to a later fresh attempt without storing content", () => {
    installStorage();
    recordVerifyIntervention({
      userId: "learner-1", subject: "Mathematics", topic: "Algebra", level: "method",
      question: "Solve 2x + 3 = 9", id: "intervention-1", occurredAt: "2026-11-14T10:00:00.000Z",
    });
    const linked = consumeVerifyIntervention({
      userId: "learner-1", subject: "Mathematics", topic: "Algebra",
      question: "Solve 3x - 4 = 11", occurredAt: "2026-11-14T11:30:00.000Z",
    });
    expect(linked).toEqual({
      interventionId: "intervention-1", interventionLevel: "method",
      interventionToAttemptHours: 1.5, freshTransfer: true,
    });
  });

  it("does not classify the identical question as transfer and consumes the intervention once", () => {
    installStorage();
    recordVerifyIntervention({
      userId: "learner-1", subject: "Physics", topic: "Waves", level: "hint",
      question: "Define wavelength", id: "intervention-2", occurredAt: "2026-11-14T10:00:00.000Z",
    });
    const linked = consumeVerifyIntervention({
      userId: "learner-1", subject: "Physics", topic: "Waves",
      question: "Define wavelength", occurredAt: "2026-11-14T10:05:00.000Z",
    });
    expect(linked?.freshTransfer).toBe(false);
    expect(consumeVerifyIntervention({
      userId: "learner-1", subject: "Physics", topic: "Waves",
      question: "Explain wave speed", occurredAt: "2026-11-14T10:10:00.000Z",
    })).toBeNull();
  });

  it("keeps interventions isolated between accounts", () => {
    installStorage();
    recordVerifyIntervention({
      userId: "learner-a", subject: "Physics", topic: "Waves", level: "hint",
      question: "Define wavelength",
    });
    expect(consumeVerifyIntervention({
      userId: "learner-b", subject: "Physics", topic: "Waves", question: "Explain wave speed",
    })).toBeNull();
  });

  it("does not retain raw question text", () => {
    installStorage();
    recordVerifyIntervention({
      userId: "learner-1", subject: "Mathematics", topic: "Algebra", level: "hint",
      question: "Secret original question",
    });
    const raw = localStorage.getItem("shadecode:cortex:verify-interventions:v1:learner-1") || "";
    expect(raw).not.toContain("Secret original question");
  });
});
