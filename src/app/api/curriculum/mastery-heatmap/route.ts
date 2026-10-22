import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";
import { isAllowedSubject } from "@/lib/academic/subjectContract";

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

    const learner = await resolveLearnerSubjects(supabase, user.id);
    if (learner.subjects.length === 0) return NextResponse.json({ syllabi: [] });

    const versions = await readAllPages<any>((from, to) => supabase
      .from("curriculum_versions")
      .select("id, syllabus_id, syllabus_version, qualification_id, subject_id, status")
      .eq("status", "verified")
      .order("subject_id", { ascending: true })
      .range(from, to));
    if (!versions.length) return NextResponse.json({ syllabi: [] });

    // Curriculum versions can contain every subject in the shared catalog.
    // Resolve their syllabus names and only expose versions for this learner's
    // currently selected subjects before reading any objective rows.
    const syllabusIds = [...new Set(versions.map(version => version.syllabus_id).filter(Boolean))];
    const { data: syllabusRows, error: syllabusError } = await supabase
      .from("syllabi")
      .select("id, subject")
      .in("id", syllabusIds);
    if (syllabusError) throw syllabusError;

    const allowedSyllabusIds = new Set((syllabusRows ?? [])
      .filter(syllabus => isAllowedSubject(syllabus.subject, learner.subjects.map(subject => subject.name)))
      .map(syllabus => syllabus.id));
    const allowedVersions = versions.filter(version => allowedSyllabusIds.has(version.syllabus_id));
    const versionIds = allowedVersions.map(version => version.id);
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

    const progressByKey = new Map(progress.map(p => [`${p.curriculum_version_id}:${p.objective_key}`, p]));
    const syllabi = allowedVersions.map(version => ({
      ...version,
      objectives: objectives.filter(o => o.curriculum_version_id === version.id).map(o => {
        const p = progressByKey.get(`${version.id}:${o.objective_key}`);
        return { ...o, mastery_score: p?.mastery_score ?? null, attempts: p?.attempts ?? 0, learner_status: p?.status ?? "not_started" };
      }),
    })).filter(s => s.objectives.length > 0);
    return NextResponse.json({ syllabi });
  } catch (error) {
    console.error("[api/curriculum/mastery-heatmap]", error);
    return NextResponse.json({ error: "Could not load syllabus mastery evidence." }, { status: 500 });
  }
}
