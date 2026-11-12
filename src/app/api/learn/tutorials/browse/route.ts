import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { matchAllowedSubject, normalizeSubjectNames } from "@/lib/academic/subjectContract";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";

/** Published tutorials for every subject the learner is enrolled in. Same subject rules as the per-subject endpoint. */
export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter);
  if (limited) return limited;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to see teacher tutorials.", tutorials: [], subjects: [] }, { status: 401 });

    const { data: profile, error: profileError } = await supabase.from("profiles").select("subjects").eq("id", user.id).maybeSingle();
    if (profileError) return NextResponse.json({ error: "Could not check your subjects.", tutorials: [], subjects: [] }, { status: 500 });
    const allowed = normalizeSubjectNames(profile?.subjects);
    if (!allowed.length) {
      return NextResponse.json({ error: "Choose your subjects in onboarding to see teacher tutorials.", tutorials: [], subjects: [] }, { status: 409 });
    }

    const admin = createSupabaseAdminClient();
    if (!admin) return NextResponse.json({ error: "Teacher tutorials are temporarily unavailable.", tutorials: [], subjects: allowed, retryable: true }, { status: 503 });
    const { data, error } = await admin
      .from("teacher_tutorials")
      .select("id,title,subject,topic,summary,version,published_at,verified_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(300);
    if (error) throw error;

    const tutorials = (data ?? []).flatMap((item) => {
      const subject = matchAllowedSubject(item.subject, allowed);
      return subject ? [{ ...item, subject }] : [];
    });
    return NextResponse.json({ tutorials, subjects: allowed }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[learn/tutorials/browse]", error);
    return NextResponse.json({ error: "Teacher tutorials are temporarily unavailable.", tutorials: [], subjects: [], retryable: true }, { status: 503 });
  }
}
