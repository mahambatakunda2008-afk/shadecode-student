import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_profiles")
    .select("education_stage, education_grade, education_year, education_curriculum, education_subjects")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not load education profile" }, { status: 500 });
  return NextResponse.json({ profile: data ?? null });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const allowed = ["education_stage", "education_grade", "education_year", "education_curriculum", "education_subjects"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) update[key] = body[key];
  if (typeof update.education_grade === "number" && (update.education_grade < 1 || update.education_grade > 13 || !Number.isInteger(update.education_grade))) {
    return NextResponse.json({ error: "Invalid education grade" }, { status: 400 });
  }
  if (update.education_subjects !== undefined && (!Array.isArray(update.education_subjects) || update.education_subjects.some((s) => typeof s !== "string"))) {
    return NextResponse.json({ error: "Invalid education subjects" }, { status: 400 });
  }

  const { data, error } = await supabase.from("user_profiles").update(update).eq("user_id", user.id).select("education_stage, education_grade, education_year, education_curriculum, education_subjects").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not save education profile" }, { status: 500 });
  return NextResponse.json({ profile: data });
}
