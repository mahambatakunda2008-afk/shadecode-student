import { describe, expect, it } from "vitest";
import { compareOperations, isOperationSuppressed, type LocalOperation } from "@/lib/local-first/operations";

const op = (deviceId: string, lamport: number, sequence: number, kind: LocalOperation["kind"] = "update", payload = { value: deviceId }): LocalOperation => ({
  id: `${deviceId}:${sequence}`,
  deviceId,
  userId: "user-1",
  entity: "task",
  entityId: "task-1",
  kind,
  payload,
  timestamp: `2026-09-01T${String(10 + sequence).padStart(2, "0")}:00:00.000Z`,
  sequence,
  lamport,
});

describe("multi-device sync policy", () => {
  it("chooses the same winner on both devices", () => {
    const a = op("device-a", 7, 1, "update", { value: "A" });
    const b = op("device-b", 7, 1, "update", { value: "B" });
    const winner = compareOperations(a, b) > 0 ? a : b;
    const winnerOnOtherDevice = compareOperations(b, a) > 0 ? b : a;
    expect(winner.id).toBe(winnerOnOtherDevice.id);
  });

  it("keeps a stale operation suppressed after a winning delete", () => {
    const staleUpdate = op("device-a", 4, 1, "update");
    const winningDelete = op("device-b", 5, 1, "delete");
    const tombstone = {
      entity: winningDelete.entity,
      entityId: winningDelete.entityId,
      userId: winningDelete.userId,
      operationId: winningDelete.id,
      deviceId: winningDelete.deviceId,
      timestamp: winningDelete.timestamp,
      sequence: winningDelete.sequence,
      lamport: winningDelete.lamport,
    };
    expect(isOperationSuppressed(staleUpdate, [tombstone])).toBe(true);
  });

  it("does not suppress an operation newer than a delete tombstone", () => {
    const newerUpdate = op("device-a", 6, 2, "update");
    const deleteOp = op("device-b", 5, 1, "delete");
    const tombstone = {
      entity: deleteOp.entity,
      entityId: deleteOp.entityId,
      userId: deleteOp.userId,
      operationId: deleteOp.id,
      deviceId: deleteOp.deviceId,
      timestamp: deleteOp.timestamp,
      sequence: deleteOp.sequence,
      lamport: deleteOp.lamport,
    };
    expect(isOperationSuppressed(newerUpdate, [tombstone])).toBe(false);
  });

  it("makes duplicate delivery idempotent by operation identity", () => {
    const first = op("device-a", 9, 3);
    const duplicate = { ...first };
    expect(duplicate.id).toBe(first.id);
    expect(compareOperations(first, duplicate)).toBe(0);
  });
});
