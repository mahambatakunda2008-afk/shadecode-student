import { beforeEach, describe, expect, it, vi } from "vitest";

const { adminFactory, query } = vi.hoisted(() => ({
  adminFactory: vi.fn(),
  query: {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
    result: { data: null as null | { status: string; completed_at: string | null }, error: null as null | { code?: string } },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => adminFactory(),
}));

import { GET } from "./route";

const get = (requestId = "8d7a0d40-5a1b-4c8e-9f6c-19d7ef3b26b1") =>
  GET(new Request(`https://shadecodestudent.vercel.app/api/account/deletion-status?requestId=${requestId}`));

beforeEach(() => {
  query.result = { data: { status: "processing", completed_at: null }, error: null };
  query.select.mockReset().mockReturnValue({ eq: query.eq });
  query.eq.mockReset().mockReturnValue({ maybeSingle: query.maybeSingle });
  query.maybeSingle.mockReset().mockImplementation(async () => query.result);
  adminFactory.mockReset().mockReturnValue({ from: vi.fn().mockReturnValue({ select: query.select }) });
});

describe("GET /api/account/deletion-status", () => {
  it("rejects malformed request IDs before accessing privileged data", async () => {
    const response = await get("not-a-uuid");
    expect(response.status).toBe(400);
    expect(adminFactory).not.toHaveBeenCalled();
  });

  it("returns only the minimal status capability payload", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "processing", completedAt: null, completed: false });
    expect(query.select).toHaveBeenCalledWith("status, completed_at");
    expect(query.eq).toHaveBeenCalledWith("id", "8d7a0d40-5a1b-4c8e-9f6c-19d7ef3b26b1");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("marks completed requests without returning account identifiers", async () => {
    query.result = { data: { status: "completed", completed_at: "2026-11-05T06:00:00Z" }, error: null };
    const response = await get();
    expect(await response.json()).toEqual({ status: "completed", completedAt: "2026-11-05T06:00:00Z", completed: true });
  });

  it("returns not found for unknown request capabilities", async () => {
    query.result = { data: null, error: null };
    expect((await get()).status).toBe(404);
  });

  it("fails closed when privileged status lookup is unavailable", async () => {
    adminFactory.mockReturnValue(null);
    expect((await get()).status).toBe(503);
  });

  it("does not expose database errors", async () => {
    query.result = { data: null, error: { code: "XX000" } };
    const response = await get();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("XX000");
  });
});
