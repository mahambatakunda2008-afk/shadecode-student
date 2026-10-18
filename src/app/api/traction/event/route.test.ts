import { beforeEach, describe, expect, it, vi } from "vitest";

const userInsert = vi.fn();
const adminInsert = vi.fn();
let currentUser: { id: string } | null = null;
let adminAvailable = true;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
    from: () => ({ insert: userInsert }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => (adminAvailable ? { from: () => ({ insert: adminInsert }) } : null),
}));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/traction/event", { method: "POST", body: JSON.stringify(body) }));
const valid = { name: "landing_viewed", clientEventId: "evt_1", path: "/", properties: { a: 1 } };

beforeEach(() => {
  userInsert.mockReset().mockResolvedValue({ error: null });
  adminInsert.mockReset().mockResolvedValue({ error: null });
  currentUser = null;
  adminAvailable = true;
});

describe("POST /api/traction/event", () => {
  it("records logged-out visitor events through the server-side client", async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(adminInsert).toHaveBeenCalledTimes(1);
    expect(adminInsert.mock.calls[0][0]).toMatchObject({ user_id: null, name: "landing_viewed" });
    expect(userInsert).not.toHaveBeenCalled();
  });
  it("keeps signed-in users on their own RLS-scoped client", async () => {
    currentUser = { id: "user-1" };
    const res = await post(valid);
    expect(res.status).toBe(200);
    expect(userInsert.mock.calls[0][0]).toMatchObject({ user_id: "user-1" });
    expect(adminInsert).not.toHaveBeenCalled();
  });
  it("falls back to the user client if the service key is not configured", async () => {
    adminAvailable = false;
    await post(valid);
    expect(userInsert).toHaveBeenCalledTimes(1);
  });
  it("drops oversized properties instead of storing them", async () => {
    await post({ ...valid, properties: { blob: "x".repeat(5000) } });
    expect(adminInsert.mock.calls[0][0].properties).toEqual({ properties_dropped: true });
  });
  it("rejects invalid event names and client ids", async () => {
    expect((await post({ ...valid, name: "bad name!" })).status).toBe(400);
    expect((await post({ ...valid, clientEventId: "bad id" })).status).toBe(400);
    expect(adminInsert).not.toHaveBeenCalled();
  });
  it("treats a duplicate client event id as success", async () => {
    adminInsert.mockResolvedValue({ error: { code: "23505" } });
    const res = await post(valid);
    expect(await res.json()).toMatchObject({ ok: true, duplicate: true });
  });
});
