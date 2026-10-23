import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeStoredCurriculumIdentities } from "@/lib/curriculum/user-profile";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 1000;

type PageResult = { data: unknown[] | null; error: unknown | null };

async function readAllPages<T>(
  queryPage: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // The exact curriculum profile is the source of truth. Never return every
    // verified syllabus just because the learner is signed in.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("curriculum_subjects")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;

    const identities = normalizeStoredCurriculumIdentities(profile?.curriculum_subjects)
      .filter((identity) => identity.syllabusId && identity.syllabusVersion);
    if (!identities.length) return NextResponse.json({ syllabi: [] });

    const identityKeys = new Set(identities.map((identity) => [
      identity.boardId,
      identity.qualificationId,
      identity.syllabusId,
      identity.syllabusVersion,
      identity.subjectId,
    ].join(":")));

    const allVerifiedVersions = await readAllPages<any>((from, to) => supabase
      .from("curriculum_versions")
      .select("id, board_id, syllabus_id, syllabus_version, qualification_id, subject_id, status")
      .eq("status", "verified")
      .order("subject_id", { ascending: true })
      .range(from, to));

    const versions = allVerifiedVersions.filter((version) => identityKeys.has([
      version.board_id,
      version.qualification_id,
      version.syllabus_id,
      version.syllabus_version,
      version.subject_id,
    ].join(":")));
    const versionIds = versions.map((version) => version.id);
    if (!versionIds.length) return NextResponse.json({ syllabi: [] });

    const [objectives, progress] = await Promise.all([
      readAllPages<any>((from, to) => supabase.from("curriculum_objectives")
        .select("curriculum_version_id, objective_key, parent_key, topic, title, education_level, status")
        .in("curriculum_version_id", versionIds)
        .eq("status", "verified")
        .order("objective_key", { ascending: true })
        .range(from, to)),
      readAllPages<any>((from, to) => supabase.from("learner_curriculum_objective_progress")
        .select("curriculum_version_id, objective_key, mastery_score, attempts, status")
        .eq("user_id", user.id)
        .in("curriculum_version_id", versionIds)
        .range(from, to)),
    ]);

    const progressByKey = new Map(progress.map((p) => [`${p.curriculum_version_id}:${p.objective_key}`, p]));
    const syllabi = versions.map((version) => ({
      ...version,
      objectives: objectives.filter((objective) => objective.curriculum_version_id === version.id).map((objective) => {
        const p = progressByKey.get(`${version.id}:${objective.objective_key}`);
        return { ...objective, mastery_score: p?.mastery_score ?? null, attempts: p?.attempts ?? 0, learner_status: p?.status ?? "not_started" };
      }),
    })).filter((syllabus) => syllabus.objectives.length > 0);
    return NextResponse.json({ syllabi });
  } catch (error) {
    console.error("[api/curriculum/mastery-heatmap]", error);
    return NextResponse.json({ error: "Could not load syllabus mastery evidence." }, { status: 500 });
  }
}
