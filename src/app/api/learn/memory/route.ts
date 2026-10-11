import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildLearnerBrainContext } from "@/lib/learn/learnerBrain";

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

    const context = await buildLearnerBrainContext(supabase, user.id, subject, topic);
    return NextResponse.json({ context, available: Boolean(context) }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ context: "", available: false }, { status: 503 });
  }
}
