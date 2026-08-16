import { describe, expect, it } from "vitest";
import { compareOperations, createOperationId, createTombstone, isOperationSuppressed, type LocalOperation } from "../operations";
describe("local-first operations", () => {
  const base: LocalOperation = { id: "device-a:1", deviceId: "device-a", userId: "user-a", entity: "task", entityId: "task-1", kind: "update", timestamp: "2026-08-16T06:00:00.000Z", sequence: 1 };
  it("creates stable ids", () => expect(createOperationId("device-a", 7)).toBe("device-a:7"));
  it("orders equal timestamps deterministically", () => expect(compareOperations(base, { ...base, id: "device-a:2", sequence: 2 })).toBeLessThan(0));
  it("creates a tombstone from a delete", () => { const deletion = { ...base, id: "device-a:2", sequence: 2, kind: "delete" as const }; expect(createTombstone(deletion).operationId).toBe("device-a:2"); });
  it("suppresses stale operations", () => { const deletion = { ...base, id: "device-a:2", sequence: 2, kind: "delete" as const }; expect(isOperationSuppressed(base, [createTombstone(deletion)])).toBe(true); });
  it("allows operations newer than a tombstone", () => { const deletion = { ...base, id: "device-a:2", sequence: 2, kind: "delete" as const }; const newer = { ...base, id: "device-a:3", sequence: 3, timestamp: "2026-08-16T07:00:00.000Z" }; expect(isOperationSuppressed(newer, [createTombstone(deletion)])).toBe(false); });
});
