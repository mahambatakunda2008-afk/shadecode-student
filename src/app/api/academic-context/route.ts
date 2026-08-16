import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PATHWAYS = new Set(["university", "tvet"]);

async function getUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase.from("academic_contexts").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Failed to load academic context" }, { status: 500 });
  return NextResponse.json({ context: data });
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const pathway = body.pathway as string;
  const programme = typeof body.programme === "string" ? body.programme.trim() : "";
  if (!PATHWAYS.has(pathway) || !programme) {
    return NextResponse.json({ error: "pathway and programme are required" }, { status: 400 });
  }

  const courses = Array.isArray(body.courses)
    ? body.courses.filter((value: unknown): value is string => typeof value === "string").map((value: string) => value.trim()).filter(Boolean)
    : [];

  const { data, error } = await supabase.from("academic_contexts").upsert({
    user_id: user.id,
    pathway,
    institution: typeof body.institution === "string" ? body.institution.trim() || null : null,
    programme,
    year_level: typeof body.year_level === "string" ? body.year_level.trim() || null : null,
    semester: typeof body.semester === "string" ? body.semester.trim() || null : null,
    courses,
  }, { onConflict: "user_id" }).select("*").single();

  if (error) return NextResponse.json({ error: "Failed to save academic context" }, { status: 500 });
  return NextResponse.json({ context: data });
}
