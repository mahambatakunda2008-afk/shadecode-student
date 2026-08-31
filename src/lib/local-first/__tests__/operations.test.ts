import { describe, expect, it } from "vitest";
import {
  compareOperations,
  createOperationId,
  createTombstone,
  isOperationSuppressed,
  type LocalOperation,
} from "../operations";

describe("canonical local operations", () => {
  const base: LocalOperation = {
    id: "device-a:1",
    deviceId: "device-a",
    userId: "user-a",
    entity: "task",
    entityId: "task-1",
    kind: "update",
    timestamp: "2026-08-16T06:00:00.000Z",
    sequence: 1,
    lamport: 1,
  };

  it("creates stable ids", () => {
    expect(createOperationId("device-a", 7)).toBe("device-a:7");
  });

  it("orders operations deterministically", () => {
    expect(compareOperations(base, { ...base, id: "device-a:2", sequence: 2 })).toBeLessThan(0);
    expect(compareOperations(base, { ...base, id: "device-b:1", deviceId: "device-b", lamport: 2 })).toBeLessThan(0);
  });

  it("creates a tombstone from a delete", () => {
    const deletion = { ...base, id: "device-a:2", sequence: 2, lamport: 2, kind: "delete" as const };
    expect(createTombstone(deletion).operationId).toBe("device-a:2");
  });

  it("suppresses operations at or before the deletion clock", () => {
    const deletion = { ...base, id: "device-a:2", sequence: 2, lamport: 2, kind: "delete" as const };
    expect(isOperationSuppressed(base, [createTombstone(deletion)])).toBe(true);
    expect(isOperationSuppressed(deletion, [createTombstone(deletion)])).toBe(true);
  });

  it("allows operations newer than a tombstone", () => {
    const deletion = { ...base, id: "device-a:2", sequence: 2, lamport: 2, kind: "delete" as const };
    const newer = { ...base, id: "device-a:3", sequence: 3, lamport: 3 };
    expect(isOperationSuppressed(newer, [createTombstone(deletion)])).toBe(false);
  });
});
