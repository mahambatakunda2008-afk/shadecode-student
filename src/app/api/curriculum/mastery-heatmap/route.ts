import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: versions, error: versionsError } = await supabase
      .from("curriculum_versions")
      .select("id, syllabus_id, syllabus_version, qualification_id, subject_id, status")
      .eq("status", "verified")
      .order("subject_id", { ascending: true });
    if (versionsError) throw versionsError;
    const versionIds = (versions ?? []).map(v => v.id);
    if (!versionIds.length) return NextResponse.json({ syllabi: [] });

    const [{ data: objectives, error: objectivesError }, { data: progress, error: progressError }] = await Promise.all([
      supabase.from("curriculum_objectives")
        .select("curriculum_version_id, objective_key, parent_key, topic, title, education_level, status")
        .in("curriculum_version_id", versionIds)
        .eq("status", "verified")
        .order("objective_key", { ascending: true }),
      supabase.from("learner_curriculum_objective_progress")
        .select("curriculum_version_id, objective_key, mastery_score, attempts, status")
        .eq("user_id", user.id)
        .in("curriculum_version_id", versionIds),
    ]);
    if (objectivesError) throw objectivesError;
    if (progressError) throw progressError;

    const progressByKey = new Map((progress ?? []).map(p => [`${p.curriculum_version_id}:${p.objective_key}`, p]));
    const syllabi = (versions ?? []).map(version => ({
      ...version,
      objectives: (objectives ?? []).filter(o => o.curriculum_version_id === version.id).map(o => {
        const p = progressByKey.get(`${version.id}:${o.objective_key}`);
        return {...o, mastery_score: p?.mastery_score ?? null, attempts: p?.attempts ?? 0, learner_status: p?.status ?? "not_started"};
      }),
    })).filter(s => s.objectives.length > 0);
    return NextResponse.json({ syllabi });
  } catch (error) {
    console.error("[api/curriculum/mastery-heatmap]", error);
    return NextResponse.json({ error: "Could not load syllabus mastery evidence." }, { status: 500 });
  }
}
