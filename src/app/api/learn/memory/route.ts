import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildLearnerBrainContext, normalizeLearnerTopic, rememberLearnerSignal } from "@/lib/learn/learnerBrain";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!token || !url || !key) {
      return NextResponse.json({ context: "", available: false }, { status: token ? 503 : 401 });
    }

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return NextResponse.json({ context: "", available: false }, { status: 401 });

    const params = new URL(req.url).searchParams;
    const subject = (params.get("subject") ?? "").slice(0, 120);
    const topic = (params.get("topic") ?? "").slice(0, 240);
    if (!subject || !topic) {
      return NextResponse.json({ error: "Subject and topic are required." }, { status: 400 });
    }

    const subjectAccess = await resolveLearnerSubject(supabase, user.id, subject);
    if (!subjectAccess.ok) {
      return NextResponse.json({ error: subjectAccess.error, code: "SUBJECT_NOT_ALLOWED" }, { status: subjectAccess.status });
    }

    const context = await buildLearnerBrainContext(supabase, user.id, subjectAccess.subject, topic);
    return NextResponse.json({ context, available: Boolean(context) }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ context: "", available: false }, { status: 503 });
  }
}


export async function POST(req: Request) {
  try {
    const sessionClient = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (!body || body.eventType !== "lesson_opened") {
      return NextResponse.json({ error: "Unsupported learner memory event." }, { status: 400 });
    }
    const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 120) : "";
    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 240) : "";
    if (!subject || !topic) return NextResponse.json({ error: "Subject and topic are required." }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ accepted: false }, { status: 503 });
    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const subjectAccess = await resolveLearnerSubject(admin, user.id, subject);
    if (!subjectAccess.ok) {
      return NextResponse.json({ error: subjectAccess.error, code: "SUBJECT_NOT_ALLOWED" }, { status: subjectAccess.status });
    }
    await rememberLearnerSignal(admin, user.id, {
      subject: subjectAccess.subject,
      topic,
      topic_key: normalizeLearnerTopic(subjectAccess.subject, topic),
      event_type: "lesson_opened",
      outcome: "opened",
      metadata: { source: "lesson_view" },
    });
    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch {
    return NextResponse.json({ accepted: false }, { status: 503 });
  }
}
