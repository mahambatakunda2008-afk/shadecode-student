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
    const base = Date.now() - 2 * 60 * 60 * 1000;
    recordVerifyIntervention({
      userId: "learner-1", subject: "Mathematics", topic: "Algebra", level: "method",
      question: "Solve 2x + 3 = 9", id: "vi_intervention1_1234567", occurredAt: new Date(base).toISOString(),
    });
    const linked = consumeVerifyIntervention({
      userId: "learner-1", subject: "Mathematics", topic: "Algebra",
      question: "Solve 3x - 4 = 11", occurredAt: new Date(base + 90 * 60 * 1000).toISOString(),
    });
    expect(linked).toEqual({
      interventionId: "vi_intervention1_1234567", interventionLevel: "method",
      interventionToAttemptHours: 1.5, freshTransfer: true,
    });
  });

  it("keeps an intervention open for two distinct fresh-transfer attempts", () => {
    installStorage();
    const base = Date.now() - 30 * 60 * 1000;
    const at = (minutes: number) => new Date(base + minutes * 60 * 1000).toISOString();
    recordVerifyIntervention({
      userId: "learner-1", subject: "Physics", topic: "Waves", level: "hint",
      question: "Define wavelength", id: "vi_intervention2_1234567", occurredAt: at(0),
    });
    const linked = consumeVerifyIntervention({
      userId: "learner-1", subject: "Physics", topic: "Waves",
      question: "Define wavelength", occurredAt: at(5),
    });
    expect(linked?.freshTransfer).toBe(false);
    const firstFresh = consumeVerifyIntervention({
      userId: "learner-1", subject: "Physics", topic: "Waves",
      question: "Explain wave speed", occurredAt: at(10),
    });
    expect(firstFresh?.freshTransfer).toBe(true);
    const repeated = consumeVerifyIntervention({
      userId: "learner-1", subject: "Physics", topic: "Waves",
      question: "Explain wave speed", occurredAt: at(12),
    });
    expect(repeated?.freshTransfer).toBe(false);
    const secondFresh = consumeVerifyIntervention({
      userId: "learner-1", subject: "Physics", topic: "Waves",
      question: "Calculate wave speed from frequency and wavelength", occurredAt: at(15),
    });
    expect(secondFresh?.freshTransfer).toBe(true);
    expect(consumeVerifyIntervention({
      userId: "learner-1", subject: "Physics", topic: "Waves",
      question: "A third fresh question", occurredAt: at(20),
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
