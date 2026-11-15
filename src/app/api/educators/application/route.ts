import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TYPES = new Set(["independent_tutor", "subject_specialist", "independent_teacher", "education_creator"]);
const clean = (value: unknown, max: number) => typeof value === "string"
  ? value.replace(/[\\u0000-\\u001f\\u007f]/g, " ").replace(/\\s+/g, " ").trim().slice(0, max)
  : "";

function cleanList(value: unknown, max: number, count: number) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => clean(item, max)).filter(Boolean))].slice(0, count);
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data, error } = await supabase.from("platform_educator_profiles")
    .select("display_name,educator_type,bio,subjects,levels,experience_years,status,review_note,created_at,updated_at")
    .eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load your educator application." }, { status: 500 });
  return NextResponse.json({ application: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to apply." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid application." }, { status: 400 });

  const displayName = clean(body.displayName, 100);
  const educatorType = clean(body.educatorType, 40);
  const bio = clean(body.bio, 1600);
  const subjects = cleanList(body.subjects, 120, 30);
  const levels = cleanList(body.levels, 100, 20);
  const experienceYears = body.experienceYears === "" || body.experienceYears == null ? null : Number(body.experienceYears);
  if (displayName.length < 2 || !TYPES.has(educatorType) || !subjects.length || !levels.length ||
      (experienceYears !== null && (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 70))) {
    return NextResponse.json({ error: "Add your display name, educator type, at least one subject and at least one level." }, { status: 400 });
  }

  const payload = {
    user_id: user.id, display_name: displayName, educator_type: educatorType,
    bio, subjects, levels, experience_years: experienceYears,
  };
  const { data: existing, error: lookupError } = await supabase.from("platform_educator_profiles")
    .select("status").eq("user_id", user.id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Could not check your application status." }, { status: 500 });
  if (existing && !["pending", "changes_requested"].includes(existing.status)) {
    return NextResponse.json({ error: "Your application is already under review or has a decision. You cannot replace it here." }, { status: 409 });
  }

  const query = existing
    ? supabase.from("platform_educator_profiles").update(payload).eq("user_id", user.id)
    : supabase.from("platform_educator_profiles").insert(payload);
  const { error } = await query;
  if (error) return NextResponse.json({ error: "Could not save your application. Please check the details and try again." }, { status: 500 });
  return NextResponse.json({ ok: true, status: existing?.status ?? "pending" }, { status: existing ? 200 : 201 });
}
