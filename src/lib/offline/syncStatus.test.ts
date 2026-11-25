import { describe, expect, it } from "vitest";
import type { LocalOperation } from "@/lib/local-first/operations";
import { countLocalOnlyOperations } from "./syncStatus";

function operation(entity: LocalOperation["entity"], syncedAt?: string): LocalOperation {
  return {
    id: `device:1`,
    deviceId: "device",
    userId: "user",
    entity,
    entityId: "record",
    kind: "update",
    payload: {},
    timestamp: "2026-11-22T10:00:00.000Z",
    sequence: 1,
    lamport: 1,
    ...(syncedAt ? { syncedAt } : {}),
  };
}

describe("local-only offline sync status", () => {
  it("does not double-count operations already bridged by the mutation queue", () => {
    expect(countLocalOnlyOperations([
      operation("task"),
      operation("subject"),
      operation("progress"),
    ])).toBe(0);
  });

  it("counts pending entity types that the current sync adapter cannot send", () => {
    expect(countLocalOnlyOperations([
      operation("education_profile"),
      operation("exam_attempt"),
      operation("exam_result"),
      operation("xp"),
      operation("achievement"),
      operation("timetable"),
      operation("goal"),
      operation("study_session"),
    ])).toBe(8);
  });

  it("does not count acknowledged local operations", () => {
    expect(countLocalOnlyOperations([
      operation("exam_attempt", "2026-11-22T10:01:00.000Z"),
      operation("task"),
    ])).toBe(0);
  });
});
