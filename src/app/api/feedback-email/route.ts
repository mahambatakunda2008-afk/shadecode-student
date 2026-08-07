import { Resend } from "resend";
import { applyRateLimit, authLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["bug", "feature", "general"]);
const MAX_MESSAGE_LENGTH = 5000;

export async function POST(req: Request) {
  try {
    // This route is unauthenticated by design (feedback should work even
    // if session state is flaky), so rate limit by IP -- authLimiter's
    // 5-per-15min is appropriate for an endpoint that sends a real email
    // per request via Resend.
    const rateLimitResponse = await applyRateLimit(req, authLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const { type, message, userId } = await req.json();

    if (!VALID_TYPES.has(type)) {
      return Response.json({ success: false, error: "Invalid feedback type" }, { status: 400 });
    }
    if (typeof message !== "string" || message.trim().length === 0) {
      return Response.json({ success: false, error: "Message is required" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return Response.json({ success: false, error: "Message too long" }, { status: 400 });
    }
    // userId is client-supplied and unverified -- never treat it as a
    // trusted claim of identity, only as a display hint in the email.
    const displayUserId = typeof userId === "string" && userId.length < 200 ? userId : "anonymous";

    const resend = new Resend(process.env.RESEND_API_KEY!);
    const email = await resend.emails.send({
      from: "Shadecode <onboarding@resend.dev>",
      to: process.env.FEEDBACK_EMAIL!,
      subject: `🧠 New Feedback: ${type}`,
      text: `
NEW FEEDBACK RECEIVED

Type: ${type}
User: ${displayUserId} (client-supplied, unverified)

Message:
${message}

---
Shadecode Feedback System
      `,
    });

    if (email.error) {
      console.error(email.error);
      return Response.json({ success: false }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Email route error:", err);
    return Response.json({ success: false }, { status: 500 });
  }
}