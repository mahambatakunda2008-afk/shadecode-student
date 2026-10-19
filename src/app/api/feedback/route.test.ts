import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  insertMock,
  serverInsertMock,
  rpcMock,
  sendMock,
  resendConstructor,
  currentUser,
  adminAvailable,
} = vi.hoisted(() => ({
  insertMock: vi.fn(),
  serverInsertMock: vi.fn(),
  rpcMock: vi.fn(),
  sendMock: vi.fn(),
  resendConstructor: vi.fn(),
  currentUser: { value: null as { id: string } | null },
  adminAvailable: { value: true },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser.value }, error: null }) },
    from: () => ({ insert: serverInsertMock }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => adminAvailable.value ? { rpc: rpcMock, from: () => ({ insert: insertMock }) } : null,
}));
vi.mock("resend", () => ({ Resend: resendConstructor }));

import { POST } from "./route";

const post = (body: unknown, headers: Record<string, string> = { "x-real-ip": "203.0.113.10" }) =>
  POST(new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  }));

beforeEach(() => {
  insertMock.mockReset().mockResolvedValue({ error: null });
  serverInsertMock.mockReset().mockResolvedValue({ error: null });
  rpcMock.mockReset().mockResolvedValue({ data: true, error: null });
  sendMock.mockReset().mockResolvedValue({ data: { id: "email-1" }, error: null });
  resendConstructor.mockReset().mockImplementation(function (this: { emails: { send: typeof sendMock } }) {
    this.emails = { send: sendMock };
  });
  currentUser.value = null;
  adminAvailable.value = true;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-secret";
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.FEEDBACK_EMAIL = "feedback@example.com";
});

describe("POST /api/feedback", () => {
  it("validates category, message type, emptiness and length before database access", async () => {
    expect((await post({ type: "other", message: "Useful note" })).status).toBe(400);
    expect((await post({ type: "bug", message: 42 })).status).toBe(400);
    expect((await post({ type: "bug", message: "   " })).status).toBe(400);
    expect((await post({ type: "general", message: "x".repeat(501) })).status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects oversized request bodies before parsing or persistence", async () => {
    const response = await POST(new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "x-real-ip": "203.0.113.10" },
      body: JSON.stringify({ type: "general", message: "x".repeat(9000) }),
    }));
    expect(response.status).toBe(413);
    expect(insertMock).not.toHaveBeenCalled();
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("accepts the 500-character message boundary after trimming", async () => {
    const message = "x".repeat(500);
    const response = await post({ type: "general", message: `  ${message}  ` });
    expect(response.status).toBe(201);
    expect(insertMock.mock.calls[0][0].message).toBe(message);
  });

  it("persists anonymous feedback with a server-controlled null user id", async () => {
    const response = await post({ type: "feature", message: "  Add better practice questions  ", user_id: "someone-else" });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true });
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      user_id: null,
      type: "feature",
      message: "Add better practice questions",
    }));
    expect(insertMock.mock.calls[0][0]).not.toHaveProperty("userId");
    expect(serverInsertMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock.mock.calls[0][0]).toBe("consume_feedback_rate_limit");
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("derives signed-in identity on the server and applies user plus IP limits", async () => {
    currentUser.value = { id: "trusted-user-id" };
    const response = await post({ type: "bug", message: "The lesson did not load", user_id: "forged-user-id" });
    expect(response.status).toBe(201);
    expect(insertMock.mock.calls[0][0]).toMatchObject({ user_id: "trusted-user-id" });
    expect(serverInsertMock).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_bucket_key: "user:trusted-user-id", p_window_seconds: 900, p_max_requests: 5 });
    expect(rpcMock.mock.calls[1][1].p_max_requests).toBe(20);
    expect(String(rpcMock.mock.calls[1][1].p_bucket_key)).toMatch(/^ip:[a-f0-9]{64}$/);
  });

  it("rejects anonymous submissions when no trustworthy IP header is available", async () => {
    const response = await post({ type: "general", message: "Useful note" }, {});
    expect(response.status).toBe(503);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("fails closed if the shared rate limiter is unavailable", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "database unavailable" } });
    const response = await post({ type: "bug", message: "Something broke" });
    expect(response.status).toBe(503);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the shared rate limit is exceeded", async () => {
    rpcMock.mockResolvedValueOnce({ data: false, error: null });
    const response = await post({ type: "general", message: "Another note" });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("900");
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("does not report success if feedback persistence fails", async () => {
    insertMock.mockResolvedValueOnce({ error: { message: "insert failed" } });
    const response = await post({ type: "bug", message: "The save failed" });
    expect(response.status).toBe(500);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("keeps successful persistence successful when email notification fails", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "provider down" } });
    const response = await post({ type: "general", message: "A useful note" });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true });
  });

  it("fails closed if the service-role client is not configured", async () => {
    adminAvailable.value = false;
    const response = await post({ type: "general", message: "A useful note" });
    expect(response.status).toBe(503);
    expect(insertMock).not.toHaveBeenCalled();
  });
});
