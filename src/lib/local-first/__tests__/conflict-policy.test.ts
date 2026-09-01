import { describe, expect, it } from "vitest";
import { compareOperations, type LocalOperation } from "../operations";

const operation = (overrides: Partial<LocalOperation>): LocalOperation => ({
  id: "device-a:1",
  deviceId: "device-a",
  userId: "user-1",
  entity: "task",
  entityId: "task-1",
  kind: "update",
  timestamp: "2026-09-01T10:00:00.000Z",
  sequence: 1,
  lamport: 1,
  ...overrides,
});

describe("multi-device conflict policy", () => {
  it("prefers the higher Lamport clock", () => {
    expect(compareOperations(operation({ lamport: 4 }), operation({ deviceId: "device-b", lamport: 3 }))).toBeGreaterThan(0);
  });

  it("uses timestamp as the deterministic second key", () => {
    expect(compareOperations(operation({ lamport: 4, timestamp: "2026-09-01T10:00:02.000Z" }), operation({ deviceId: "device-b", lamport: 4, timestamp: "2026-09-01T10:00:01.000Z" }))).toBeGreaterThan(0);
  });

  it("uses device identity to break simultaneous timestamps", () => {
    const a = operation({ lamport: 4, deviceId: "device-a", timestamp: "2026-09-01T10:00:01.000Z" });
    const b = operation({ id: "device-b:1", lamport: 4, deviceId: "device-b", timestamp: "2026-09-01T10:00:01.000Z" });
    expect(compareOperations(a, b)).toBeLessThan(0);
  });

  it("never lets account identity affect ordering", () => {
    const a = operation({ userId: "user-1", lamport: 7 });
    const b = operation({ userId: "user-1", deviceId: "device-b", lamport: 6 });
    expect(compareOperations(a, b)).toBeGreaterThan(0);
  });
});
