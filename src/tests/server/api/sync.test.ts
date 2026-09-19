import { beforeEach, describe, expect, it, vi } from "vitest";

// /api/sync is the single server-side entry point for queued offline writes
// (tasks, subjects, learn_lessons). It accepts client-supplied payloads, so the
// guarantees below are the authorization boundary: authentication required,
// store allowlist, owner can never be spoofed, and RPC results (idempotent
// replay / causal conflict) are surfaced with the right HTTP semantics so the
// client queue knows when it is safe to drop a mutation.

const getUser = vi.fn();
const rpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser }, rpc }),
}));

const USER = { id: "user-1" };

const validBody = () => ({
  operation: "update",
  store: "tasks",
  payload: { id: "task-1", title: "Revise algebra", completed: false },
  clientVersion: 3,
  baseVersion: 2,
  deviceId: "device-a",
});

async function post(body: unknown, raw = false) {
  const { POST } = await import("@/app/api/sync/route");
  return POST(
    new Request("http://localhost/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw ? (body as string) : JSON.stringify(body),
    }),
  );
}

describe("POST /api/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: USER }, error: null });
    rpc.mockResolvedValue({ data: { ok: true, status: "accepted", version: 3 }, error: null });
  });

  describe("authentication", () => {
    it("rejects unauthenticated requests without touching the database", async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await post(validBody());
      expect(res.status).toBe(401);
      expect(rpc).not.toHaveBeenCalled();
    });

    it("rejects when the auth lookup errors", async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: new Error("jwt expired") });
      const res = await post(validBody());
      expect(res.status).toBe(401);
      expect(rpc).not.toHaveBeenCalled();
    });
  });

  describe("input validation", () => {
    it("rejects malformed JSON", async () => {
      const res = await post("{not json", true);
      expect(res.status).toBe(400);
      expect(rpc).not.toHaveBeenCalled();
    });

    it("only allows the approved offline stores", async () => {
      for (const store of ["profiles", "user_careers", "cortex_events", "tasks; drop table tasks"]) {
        const res = await post({ ...validBody(), store });
        expect(res.status).toBe(400);
      }
      expect(rpc).not.toHaveBeenCalled();
    });

    it("rejects unknown operations", async () => {
      const res = await post({ ...validBody(), operation: "truncate" });
      expect(res.status).toBe(400);
      expect(rpc).not.toHaveBeenCalled();
    });

    it("rejects missing or non-object payloads", async () => {
      for (const payload of [undefined, null, "x", 7, ["a"]]) {
        const res = await post({ ...validBody(), payload });
        expect(res.status).toBe(400);
      }
      expect(rpc).not.toHaveBeenCalled();
    });

    it("rejects record ids that are missing or contain unsafe characters", async () => {
      for (const id of [undefined, "", "a b", "../etc", "x'; --", "a".repeat(201)]) {
        const res = await post({ ...validBody(), payload: { ...validBody().payload, id } });
        expect(res.status).toBe(400);
      }
      expect(rpc).not.toHaveBeenCalled();
    });

    it("requires sane version metadata and a device id", async () => {
      const bad = [
        { clientVersion: -1 },
        { clientVersion: 1.5 },
        { clientVersion: "3" },
        { baseVersion: undefined },
        { baseVersion: -2 },
        { deviceId: "" },
        { deviceId: "d".repeat(201) },
        { deviceId: undefined },
      ];
      for (const override of bad) {
        const res = await post({ ...validBody(), ...override });
        expect(res.status).toBe(400);
      }
      expect(rpc).not.toHaveBeenCalled();
    });
  });

  describe("ownership", () => {
    it("rejects a payload that claims a different owner", async () => {
      const res = await post({ ...validBody(), payload: { ...validBody().payload, user_id: "someone-else" } });
      expect(res.status).toBe(403);
      expect(rpc).not.toHaveBeenCalled();
    });

    it("always writes as the authenticated user, even if the client omits user_id", async () => {
      await post(validBody());
      expect(rpc).toHaveBeenCalledTimes(1);
      const [fn, args] = rpc.mock.calls[0];
      expect(fn).toBe("apply_sync_mutation");
      expect(args.p_payload.user_id).toBe(USER.id);
      expect(args).toMatchObject({
        p_store: "tasks",
        p_operation: "update",
        p_record_id: "task-1",
        p_base_version: 2,
        p_client_version: 3,
        p_device_id: "device-a",
      });
    });

    it("accepts a payload whose user_id matches the session", async () => {
      const res = await post({ ...validBody(), payload: { ...validBody().payload, user_id: USER.id } });
      expect(res.status).toBe(200);
    });
  });

  describe("result semantics (drives when the client queue may drop a mutation)", () => {
    it("returns 200 for an accepted mutation", async () => {
      const res = await post(validBody());
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ status: "accepted", version: 3 });
    });

    it("returns 200 for an idempotent replay so retries are safe", async () => {
      rpc.mockResolvedValue({ data: { ok: true, status: "already-applied", version: 3 }, error: null });
      const res = await post(validBody());
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ status: "already-applied" });
    });

    it("returns 409 with the server version on a causal conflict", async () => {
      rpc.mockResolvedValue({
        data: { ok: true, status: "conflict", currentVersion: 9, currentDeviceId: "device-b" },
        error: null,
      });
      const res = await post(validBody());
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ status: "conflict", currentVersion: 9, currentDeviceId: "device-b" });
    });

    it("returns a generic 500 (client retries) and never leaks database error text", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      rpc.mockResolvedValue({
        data: null,
        error: { code: "23505", message: 'duplicate key value violates unique constraint "sync_revisions_pkey"' },
      });
      const res = await post(validBody());
      expect(res.status).toBe(500);
      const text = JSON.stringify(await res.json());
      expect(text).toBe(JSON.stringify({ ok: false, error: "Sync failed" }));
      expect(text).not.toContain("sync_revisions_pkey");
      // ...but the detail is still available to operators, without the payload.
      expect(consoleError).toHaveBeenCalledTimes(1);
      const logged = JSON.stringify(consoleError.mock.calls[0]);
      expect(logged).toContain("sync_revisions_pkey");
      expect(logged).not.toContain("Revise algebra");
      consoleError.mockRestore();
    });

    it("returns 403 with the fixed message for a cross-account record", async () => {
      rpc.mockResolvedValue({ data: null, error: { message: "Record ownership does not match authenticated user" } });
      const res = await post(validBody());
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ ok: false, error: "Record ownership does not match authenticated user" });
    });

    it("never reports success for an unrecognised RPC result", async () => {
      rpc.mockResolvedValue({ data: { ok: true, status: "mystery" }, error: null });
      const res = await post(validBody());
      expect(res.status).toBe(500);
      rpc.mockResolvedValue({ data: null, error: null });
      const res2 = await post(validBody());
      expect(res2.status).toBe(500);
    });
  });
});
