import { describe, expect, it } from "vitest";
import { evidenceFromWork, mergeEvidence } from "./evidence";
import type { WorkObject } from "./types";

const work = (overrides: Partial<WorkObject> = {}): WorkObject => ({
  id: "work-1",
  mode: "assessment",
  subject: "Accounting",
  topic: "Final accounts",
  createdAt: "2026-08-18T08:00:00.000Z",
  updatedAt: "2026-08-18T08:10:00.000Z",
  ...overrides,
});

describe("StudySpace evidence", () => {
  it("normalizes arbitrary subjects and strong results", () => {
    const evidence = evidenceFromWork(work({ marks: { earned: 9, available: 10 } }));
    expect(evidence.subject).toBe("Accounting");
    expect(evidence.topic).toBe("Final accounts");
    expect(evidence.percentage).toBe(90);
    expect(evidence.outcome).toBe("mastered");
  });

  it("recognizes struggling marked work", () => {
    const evidence = evidenceFromWork(work({ marks: { earned: 3, available: 10 } }));
    expect(evidence.percentage).toBe(30);
    expect(evidence.outcome).toBe("struggled");
  });

  it("handles work without marks", () => {
    const evidence = evidenceFromWork(work({ mode: "workmate", response: "My answer" }));
    expect(evidence.percentage).toBeUndefined();
    expect(evidence.outcome).toBe("submitted");
  });

  it("sorts newest evidence first", () => {
    const old = evidenceFromWork(work({ id: "old", updatedAt: "2026-08-18T08:00:00.000Z" }));
    const newer = evidenceFromWork(work({ id: "new", updatedAt: "2026-08-18T09:00:00.000Z" }));
    expect(mergeEvidence([old, newer]).map((item) => item.workId)).toEqual(["new", "old"]);
  });
});
