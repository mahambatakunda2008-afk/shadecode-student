import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface AuthContext { supabase: SupabaseClient; user: User; }

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function bearer(req: Request) {
  const value = req.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() || null : null;
}

async function authenticate(req: Request): Promise<AuthContext | null> {
  const admin = getAdmin();
  const token = bearer(req);
  if (token) {
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (!error && user) return { supabase: admin, user };
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    const cookieStore = await cookies();
    const sessionClient = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(values) {
          try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    });
    const { data: { user }, error } = await sessionClient.auth.getUser();
    return error || !user ? null : { supabase: admin, user };
  } catch {
    return null;
  }
}

function normalize(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "";
}

export async function GET(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supabase, user } = auth;
    const url = new URL(req.url);
    const requestedSubjectId = url.searchParams.get("subjectId");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("curriculum_board, qualification, syllabus_code, syllabus_year, education_stage, curriculum_subjects")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) return NextResponse.json({ error: "Unable to resolve academic context." }, { status: 500 });

    const subjectsQuery = supabase.from("subjects").select("id, name").eq("user_id", user.id);
    const { data: subjects, error: subjectsError } = await subjectsQuery;
    if (subjectsError) return NextResponse.json({ error: "Unable to resolve subject." }, { status: 500 });

    const subject = requestedSubjectId
      ? (subjects ?? []).find((item) => item.id === requestedSubjectId)
      : (subjects ?? [])[0];

    if (!subject) {
      return NextResponse.json({
        available: false,
        reason: "SUBJECT_REQUIRED",
        message: "Choose a subject before asking for the next curriculum objective.",
      });
    }

    const storedSubjects = Array.isArray(profile?.curriculum_subjects) ? profile.curriculum_subjects : [];
    const stored = storedSubjects.find((item: any) => {
      if (!item || typeof item !== "object") return false;
      const subjectName = normalize(item.subjectName ?? item.name);
      const subjectId = normalize(item.subjectId ?? item.id);
      return subjectName === normalize(subject.name) || subjectId === normalize(subject.id);
    }) as Record<string, unknown> | undefined;

    const boardId = String(stored?.boardId ?? profile?.curriculum_board ?? "").trim();
    const qualificationId = String(stored?.qualificationId ?? stored?.qualification ?? profile?.qualification ?? "").trim();
    const syllabusId = String(stored?.syllabusId ?? stored?.syllabusCode ?? profile?.syllabus_code ?? "").trim();
    const syllabusVersion = String(stored?.syllabusVersion ?? stored?.year ?? profile?.syllabus_year ?? "").trim();
    const subjectId = String(stored?.subjectId ?? "").trim() || normalize(subject.name);

    if (!boardId || !qualificationId || !syllabusId || !syllabusVersion) {
      return NextResponse.json({
        available: false,
        reason: "CURRICULUM_NOT_SELECTED",
        message: "Your exact exam board, qualification, syllabus and version are not fully selected yet.",
        subject: subject.name,
      });
    }

    const { data: versions, error: versionError } = await supabase
      .from("curriculum_versions")
      .select("id, board_id, qualification_id, syllabus_id, syllabus_version, subject_id, effective_from, effective_to, status")
      .eq("board_id", boardId)
      .eq("qualification_id", qualificationId)
      .eq("syllabus_id", syllabusId)
      .eq("syllabus_version", syllabusVersion)
      .eq("status", "verified");
    if (versionError) return NextResponse.json({ error: "Unable to resolve verified curriculum." }, { status: 500 });

    const version = (versions ?? []).find((item) =>
      normalize(item.subject_id) === normalize(subjectId) || normalize(item.subject_id) === normalize(subject.name)
    );

    if (!version) {
      return NextResponse.json({
        available: false,
        reason: "CURRICULUM_UNVERIFIED",
        message: "This exact curriculum is not verified in Shadecode yet. No syllabus-specific objective will be invented.",
        subject: subject.name,
        board: boardId,
        qualification: qualificationId,
        syllabus: syllabusId,
        version: syllabusVersion,
      });
    }

    const { data, error } = await supabase.rpc("get_next_curriculum_objective", {
      p_curriculum_version_id: version.id,
    });
    if (error) return NextResponse.json({ error: "Unable to select the next objective." }, { status: 500 });

    const objective = Array.isArray(data) ? data[0] ?? null : null;
    if (!objective) {
      return NextResponse.json({
        available: false,
        reason: "CURRICULUM_COMPLETE",
        message: "You have completed every verified objective currently available for this curriculum.",
        curriculumVersionId: version.id,
        subject: subject.name,
      });
    }

    const { count: totalObjectives } = await supabase
      .from("curriculum_objectives")
      .select("id", { count: "exact", head: true })
      .eq("curriculum_version_id", version.id)
      .eq("status", "verified");

    return NextResponse.json({
      available: true,
      curriculumVersionId: version.id,
      curriculum: {
        boardId: version.board_id,
        qualificationId: version.qualification_id,
        syllabusId: version.syllabus_id,
        syllabusVersion: version.syllabus_version,
        subjectId: version.subject_id,
        educationStage: profile?.education_stage ?? null,
      },
      progress: { totalObjectives: totalObjectives ?? 0 },
      objective,
    });
  } catch (error) {
    console.error("[learn/next-objective]", error);
    return NextResponse.json({ error: "Something went wrong while selecting the next objective." }, { status: 500 });
  }
}
