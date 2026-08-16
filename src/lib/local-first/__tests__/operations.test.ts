import { describe, expect, it } from "vitest";
import {
  compareOperations,
  createOperationId,
  createTombstone,
  isOperationSuppressed,
  type LocalOperation,
} from "../operations";

describe("local-first operations", () => {
  const base: LocalOperation = {
    id: createOperationId("device-a", 1),
    deviceId: "device-a",
    userId: "user-a",
    entity: "task",
    entityId: "task-1",
    kind: "update",
    payload: { completed: true },
    timestamp: "2026-08-16T06:00:00.000Z",
    sequence: 1,
  };

  it("creates stable operation ids", () => {
    expect(createOperationId("device-a", 7)).toBe("device-a:7");
  });

  it("orders equal timestamps deterministically", () => {
    const laterSequence = { ...base, id: "device-a:2", sequence: 2 };
    expect(compareOperations(base, laterSequence)).toBeLessThan(0);
  });

  it("creates tombstones only for deletes", () => {
    const deletion = { ...base, kind: "delete" as const, id: "device-a:2", sequence: 2 };
    const tombstone = createTombstone(deletion);
    expect(tombstone.entityId).toBe("task-1");
    expect(tombstone.operationId).toBe("device-a:2");
  });

  it("suppresses an operation at or before a delete tombstone", () => {
    const deletion = { ...base, kind: "delete" as const, id: "device-a:2", sequence: 2 };
    const tombstone = createTombstone(deletion);
    expect(isOperationSuppressed(base, [tombstone])).toBe(true);
  });

  it("does not suppress an operation after a delete tombstone", () => {
    const deletion = { ...base, kind: "delete" as const, id: "device-a:2", sequence: 2 };
    const later = { ...base, id: "device-a:3", sequence: 3, timestamp: "2026-08-16T07:00:00.000Z" };
    expect(isOperationSuppressed(later, [createTombstone(deletion)])).toBe(false);
  });
});
