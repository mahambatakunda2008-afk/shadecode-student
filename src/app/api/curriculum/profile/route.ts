import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeStoredCurriculumIdentities } from "@/lib/curriculum/user-profile";

export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("curriculum_subjects")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to load curriculum profile" }, { status: 500 });
  return NextResponse.json({ curriculumSubjects: normalizeStoredCurriculumIdentities(data?.curriculum_subjects) });
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).curriculumSubjects
    : undefined;
  const identities = normalizeStoredCurriculumIdentities(raw);

  if (!Array.isArray(raw) || identities.length !== raw.length) {
    return NextResponse.json({
      error: "Each curriculum subject must include exact boardId, qualificationId, level, syllabusId, syllabusVersion, and subjectId fields.",
    }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ curriculum_subjects: identities })
    .eq("id", user.id)
    .select("curriculum_subjects")
    .single();

  if (error) return NextResponse.json({ error: "Failed to save curriculum profile" }, { status: 500 });
  return NextResponse.json({ curriculumSubjects: normalizeStoredCurriculumIdentities(data.curriculum_subjects) });
}
