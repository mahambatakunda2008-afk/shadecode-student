import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";

const clean = (value: string | null, max: number) =>
  (value ?? "").replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter);
  if (limited) return limited;
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to discover educators." }, { status: 401 });

  const subject = clean(request.nextUrl.searchParams.get("subject"), 120);
  const level = clean(request.nextUrl.searchParams.get("level"), 100);
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Educator discovery is temporarily unavailable." }, { status: 503 });
  const { data, error } = await admin.from("platform_educator_profiles")
    .select("user_id,display_name,educator_type,bio,subjects,levels,experience_years")
    .eq("status", "approved").order("reviewed_at", { ascending: false }).limit(200);
  if (error) {
    console.error("[learn/educators]", error);
    return NextResponse.json({ error: "Educator discovery is temporarily unavailable." }, { status: 503 });
  }

  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const rows = (data ?? []) as { user_id: string; display_name: string; educator_type: string; bio: string; subjects: string[]; levels: string[]; experience_years: number | null }[];
  const educators = rows.filter(item =>
    (!subject || item.subjects.some(value => normalize(value) === normalize(subject))) &&
    (!level || item.levels.some(value => normalize(value) === normalize(level)))
  ).map(item => ({
    id: item.user_id,
    displayName: item.display_name,
    educatorType: item.educator_type,
    bio: item.bio,
    subjects: item.subjects,
    levels: item.levels,
    experienceYears: item.experience_years,
  }));
  return NextResponse.json({ educators, total: educators.length }, { headers: { "Cache-Control": "private, no-store" } });
}
