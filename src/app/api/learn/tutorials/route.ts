import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";
import { matchAllowedSubject, normalizeSubjectNames } from "@/lib/academic/subjectContract";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter);
  if (limited) return limited;
  const requested = (request.nextUrl.searchParams.get("subject") ?? "").trim().slice(0, 120);
  if (!requested) return NextResponse.json({ error: "Choose a subject.", tutorials: [] }, { status: 400 });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to access tutorials.", tutorials: [] }, { status: 401 });

    const access = await resolveLearnerSubject(supabase, user.id, requested);
    if (!access.ok) return NextResponse.json({ error: access.error, tutorials: [] }, { status: access.status });

    const { data, error } = await supabase
      .from("teacher_tutorials")
      .select("id,title,subject,topic,summary,version,published_at,updated_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const tutorials = (data ?? []).filter((item) => matchAllowedSubject(item.subject, [access.subject]) === access.subject);
    return NextResponse.json({ tutorials }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[learn/tutorials]", error);
    return NextResponse.json({ error: "Published tutorials are temporarily unavailable.", tutorials: [], retryable: true }, { status: 503 });
  }
}
