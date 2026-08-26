import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildKnowledgeGraph, rankNextTopics } from "@/lib/mastery/graph";
import { generateStudyPlan, type StudyPlanInput } from "@/lib/studyPlan/generator";
import type { StudyGoals } from "@/lib/studyPlan/types";

export const dynamic = "force-dynamic";

const VALID_GRADES = ["A*", "A", "B", "C", "D", "E", "U"];

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("study_plans")
      .select("id, target_grade, exam_date, available_hours_per_week, subjects, priority_subjects, plan, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plan: data?.plan ?? null, meta: data ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load study plan" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const targetGrade = body.targetGrade as StudyGoals["targetGrade"];
    const examDate = body.examDate as string;
    const availableHoursPerWeek = Number(body.availableHoursPerWeek);
    const subjects = Array.isArray(body.subjects) ? body.subjects.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0) : [];
    const prioritySubjects = Array.isArray(body.prioritySubjects)
      ? body.prioritySubjects.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      : undefined;

    if (!targetGrade || !VALID_GRADES.includes(targetGrade)) {
      return NextResponse.json({ error: "A valid targetGrade is required" }, { status: 400 });
    }
    if (!examDate || Number.isNaN(new Date(examDate).getTime())) {
      return NextResponse.json({ error: "A valid examDate is required" }, { status: 400 });
    }
    if (new Date(examDate).getTime() <= Date.now()) {
      return NextResponse.json({ error: "examDate must be in the future" }, { status: 400 });
    }
    if (!Number.isFinite(availableHoursPerWeek) || availableHoursPerWeek <= 0 || availableHoursPerWeek > 168) {
      return NextResponse.json({ error: "availableHoursPerWeek must be between 0 and 168" }, { status: 400 });
    }
    if (subjects.length === 0 || subjects.length > 30) {
      return NextResponse.json({ error: "Choose between 1 and 30 subjects" }, { status: 400 });
    }

    const { data: masteryRows, error: masteryError } = await supabase
      .from("topic_mastery")
      .select("subject, topic, mastery_score, attempts, last_attempted")
      .eq("user_id", user.id)
      .in("subject", subjects)
      .lt("mastery_score", 60);

    if (masteryError) {
      return NextResponse.json({ error: masteryError.message }, { status: 500 });
    }

    const topicHints: StudyPlanInput["topicHints"] = {};
    const bySubject = new Map<string, typeof masteryRows>();
    for (const row of masteryRows ?? []) {
      if (!row.subject || !row.topic) continue;
      const rows = bySubject.get(row.subject) ?? [];
      rows.push(row);
      bySubject.set(row.subject, rows);
    }

    for (const subject of subjects) {
      const rows = bySubject.get(subject) ?? [];
      const graph = buildKnowledgeGraph(
        rows.map((row) => ({
          topicId: `${subject}:${row.topic}`,
          masteryScore: Number(row.mastery_score ?? 0),
          evidenceCount: Math.max(0, Number(row.attempts ?? 1)),
          lastSeenAt: row.last_attempted,
        })),
      );
      const ranked = rankNextTopics(graph).map((node) => node.topicId.slice(`${subject}:`.length));
      topicHints[subject] = { weak: ranked, fresh: [] };
    }

    const plan = await generateStudyPlan({
      userId: user.id,
      targetGrade,
      examDate,
      availableHoursPerWeek,
      subjects,
      prioritySubjects,
      topicHints,
    });

    const { error: deactivateError } = await supabase
      .from("study_plans")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (deactivateError) return NextResponse.json({ error: deactivateError.message }, { status: 500 });

    const { data: inserted, error: insertError } = await supabase
      .from("study_plans")
      .insert({
        user_id: user.id,
        target_grade: targetGrade,
        exam_date: examDate,
        available_hours_per_week: availableHoursPerWeek,
        subjects,
        priority_subjects: prioritySubjects ?? null,
        plan,
        is_active: true,
      })
      .select("id, plan, created_at")
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ plan: inserted.plan }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate study plan" },
      { status: 500 },
    );
  }
}
