import { beforeEach, describe, expect, it, vi } from "vitest";

const { resendSend, resendConstructor, applyRateLimitMock } = vi.hoisted(() => ({
  resendSend: vi.fn(),
  resendConstructor: vi.fn(),
  applyRateLimitMock: vi.fn(),
}));

vi.mock("resend", () => ({ Resend: resendConstructor }));
vi.mock("@/lib/rate-limit/limiter", () => ({
  applyRateLimit: applyRateLimitMock,
  authLimiter: {},
}));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/feedback-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));

beforeEach(() => {
  resendSend.mockReset().mockResolvedValue({ data: { id: "email-1" }, error: null });
  resendConstructor.mockReset().mockImplementation(() => ({ emails: { send: resendSend } }));
  applyRateLimitMock.mockReset().mockResolvedValue(null);
  process.env.RESEND_API_KEY = "test-key";
  process.env.FEEDBACK_EMAIL = "feedback@example.com";
});

describe("POST /api/feedback-email", () => {
  it("rejects unsupported feedback types without sending email", async () => {
    const response = await post({ type: "other", message: "Useful feedback" });
    expect(response.status).toBe(400);
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("rejects empty or non-string messages", async () => {
    expect((await post({ type: "bug", message: "   " })).status).toBe(400);
    expect((await post({ type: "bug", message: 42 })).status).toBe(400);
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("trims the message and accepts the 500-character contract", async () => {
    const message = "x".repeat(500);
    const response = await post({ type: "feature", message: `  ${message}  ` });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(resendSend).toHaveBeenCalledWith(expect.objectContaining({
      subject: "🧠 New Feedback: feature",
      text: expect.stringContaining(`Message:\n${message}`),
    }));
  });

  it("rejects messages longer than 500 characters after trimming", async () => {
    const response = await post({ type: "general", message: "x".repeat(501) });
    expect(response.status).toBe(400);
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("returns the rate-limit response without sending email", async () => {
    const limited = Response.json({ error: "Too many requests" }, { status: 429 });
    applyRateLimitMock.mockResolvedValueOnce(limited);
    const response = await post({ type: "bug", message: "It broke" });
    expect(response.status).toBe(429);
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("returns a server error when the email provider reports failure", async () => {
    resendSend.mockResolvedValueOnce({ data: null, error: { message: "provider down" } });
    const response = await post({ type: "general", message: "A useful note" });
    expect(response.status).toBe(500);
  });
});
