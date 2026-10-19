import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["bug", "feature", "general"]);
const MAX_MESSAGE_LENGTH = 500;
const RATE_WINDOW_SECONDS = 15 * 60;
const RATE_MAX_USER_REQUESTS = 5;
const RATE_MAX_IP_REQUESTS = 20;
const NOTIFICATION_BUDGET_MS = 1200;

function getClientIp(request: Request): string | null {
  const direct = request.headers.get("x-real-ip")?.trim();
  if (direct) return direct.slice(0, 128);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded ? forwarded.slice(0, 128) : null;
}

function ipBucketKey(ip: string, secret: string): string {
  return `ip:${createHmac("sha256", secret).update(ip).digest("hex")}`;
}

async function consumeRateLimit(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  bucketKey: string,
  maxRequests: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc("consume_feedback_rate_limit", {
    p_bucket_key: bucketKey,
    p_window_seconds: RATE_WINDOW_SECONDS,
    p_max_requests: maxRequests,
  });
  if (error || typeof data !== "boolean") throw new Error("Feedback rate limiter unavailable");
  return data;
}

async function sendNotificationBestEffort(type: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.FEEDBACK_EMAIL;
  if (!apiKey || !recipient) return;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const resend = new Resend(apiKey);
    const send = resend.emails.send({
      from: "Shadecode <onboarding@resend.dev>",
      to: recipient,
      subject: `New Shadecode feedback: ${type}`,
      text: `NEW FEEDBACK RECEIVED\n\nType: ${type}\n\nMessage:\n${message}\n`,
    }).then((result) => {
      if (result.error) throw new Error("Feedback email provider returned an error");
    });
    await Promise.race([
      send,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Feedback notification timed out")), NOTIFICATION_BUDGET_MS);
      }),
    ]);
  } catch {
    // Saving feedback is the primary operation. Notification is best-effort.
    console.error("[Feedback] Notification failed or exceeded its time budget");
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > 8000) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    let body: unknown;
    try {
      const rawBody = await request.text();
      if (new TextEncoder().encode(rawBody).byteLength > 8000) {
        return NextResponse.json({ error: "Request too large" }, { status: 413 });
      }
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const payload = body as { type?: unknown; message?: unknown } | null;
    const type = typeof payload?.type === "string" ? payload.type.trim() : "";
    const message = typeof payload?.message === "string" ? payload.message.trim() : "";

    if (!VALID_TYPES.has(type)) {
      return NextResponse.json({ error: "Invalid feedback type" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message must be 500 characters or fewer" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const admin = createSupabaseAdminClient();
    const rateLimitSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!admin || !rateLimitSecret) {
      return NextResponse.json({ error: "Feedback is temporarily unavailable. Please try again later." }, { status: 503 });
    }

    const ip = getClientIp(request);
    if (!user && !ip) {
      return NextResponse.json({ error: "Feedback is temporarily unavailable. Please try again later." }, { status: 503 });
    }

    try {
      if (user && !(await consumeRateLimit(admin, `user:${user.id}`, RATE_MAX_USER_REQUESTS))) {
        return NextResponse.json({ error: "Too many feedback submissions. Please try again in 15 minutes." }, {
          status: 429,
          headers: { "Retry-After": String(RATE_WINDOW_SECONDS), "Cache-Control": "no-store" },
        });
      }
      if (ip && !(await consumeRateLimit(admin, ipBucketKey(ip, rateLimitSecret), RATE_MAX_IP_REQUESTS))) {
        return NextResponse.json({ error: "Too many feedback submissions. Please try again in 15 minutes." }, {
          status: 429,
          headers: { "Retry-After": String(RATE_WINDOW_SECONDS), "Cache-Control": "no-store" },
        });
      }
    } catch {
      // Fail closed rather than accept unlimited submissions when the shared limiter is down.
      return NextResponse.json({ error: "Feedback is temporarily unavailable. Please try again later." }, { status: 503 });
    }

    const { error: insertError } = await supabase.from("feedback").insert({
      user_id: user?.id ?? null,
      type,
      message,
      created_at: new Date().toISOString(),
    });
    if (insertError) {
      console.error("[Feedback] Database persistence failed");
      return NextResponse.json({ error: "Could not save feedback. Please try again." }, { status: 500 });
    }

    // Bounded best-effort notification: it cannot turn a successful save into a failure.
    await sendNotificationBestEffort(type, message);
    return NextResponse.json({ success: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not submit feedback. Please try again." }, { status: 500 });
  }
}
