import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Authorization-boundary regression coverage for the admin-token careers route and the
// admin RBAC upload route + its size cap (security audit 2026-08-24 follow-ups).
// (The legacy ADMIN_SECRET /api/feedback route was retired; see DEVLOG 2026-09-19 (4).)

const insertSingle = vi.fn();
const storageUpload = vi.fn();

// Minimal chainable supabase-js client covering the calls these routes make.
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
      insert: () => ({ select: () => ({ single: () => insertSingle() }) }),
    }),
    storage: { from: () => ({ upload: storageUpload }) },
  }),
}));

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser } }),
}));
const hasUserRole = vi.fn();
vi.mock("@/lib/auth/rbac", () => ({ hasUserRole: (...a: unknown[]) => hasUserRole(...a) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  insertSingle.mockResolvedValue({ data: { id: "c1" }, error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/admin/careers (ADMIN_REVIEW_TOKEN)", () => {
  const call = async (token?: string) => {
    const { POST } = await import("@/app/api/admin/careers/route");
    return POST(
      new Request("http://localhost/api/admin/careers", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token !== undefined ? { "x-admin-token": token } : {}) },
        body: JSON.stringify({ action: "create", career: { title: "Engineer", slug: "engineer" } }),
      }),
    );
  };

  it("is forbidden when the token env var is unset, whatever is presented", async () => {
    delete process.env.ADMIN_REVIEW_TOKEN;
    expect((await call("undefined")).status).toBe(403);
    expect((await call("")).status).toBe(403);
    expect((await call()).status).toBe(403);
    expect(insertSingle).not.toHaveBeenCalled();
  });

  it("is forbidden for a wrong or missing token", async () => {
    vi.stubEnv("ADMIN_REVIEW_TOKEN", "review-token");
    expect((await call("review-toke")).status).toBe(403);
    expect((await call("review-token-x")).status).toBe(403);
    expect((await call()).status).toBe(403);
    expect(insertSingle).not.toHaveBeenCalled();
  });

  it("allows the correct token", async () => {
    vi.stubEnv("ADMIN_REVIEW_TOKEN", "review-token");
    const res = await call("review-token");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: "c1" });
  });
});

describe("POST /api/admin/exam-hub/upload", () => {
  const upload = async (bytes: number, type = "application/pdf") => {
    const { POST } = await import("@/app/api/admin/exam-hub/upload/route");
    const fd = new FormData();
    fd.set("file", new File([new Uint8Array(bytes)], "paper.pdf", { type }));
    fd.set("syllabusId", "s1");
    fd.set("level", "IGCSE");
    fd.set("session", "MJ");
    fd.set("year", "2024");
    fd.set("paperNumber", "1");
    fd.set("variant", "1");
    fd.set("kind", "qp");
    return POST(new Request("http://localhost/api/admin/exam-hub/upload", { method: "POST", body: fd }));
  };

  it("requires a signed-in admin", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await upload(10)).status).toBe(401);
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    hasUserRole.mockResolvedValue(false);
    expect((await upload(10)).status).toBe(403);
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("rejects non-PDF uploads", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    hasUserRole.mockResolvedValue(true);
    expect((await upload(10, "text/html")).status).toBe(400);
  });

  it("rejects empty and oversized files with 413 before any storage work", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    hasUserRole.mockResolvedValue(true);
    expect((await upload(0)).status).toBe(413);
    expect((await upload(25 * 1024 * 1024 + 1)).status).toBe(413);
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("accepts a file at the limit past the size check", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    hasUserRole.mockResolvedValue(true);
    const res = await upload(25 * 1024 * 1024);
    // Passes the size gate; the mocked syllabus lookup then returns no syllabus (404/400),
    // which is fine here: the point is it is NOT rejected with 413.
    expect(res.status).not.toBe(413);
  });
});
