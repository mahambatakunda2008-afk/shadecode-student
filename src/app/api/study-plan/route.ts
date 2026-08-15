import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateStudyPlan, type StudyPlanInput } from "@/lib/studyPlan/generator";
import type { StudyGoals } from "@/lib/studyPlan/types";

export const dynamic = "force-dynamic";

const VALID_GRADES = ["A*", "A", "B", "C", "D", "E", "U"];

/**
 * GET /api/study-plan
 * Returns the authenticated user's current active study plan, or null if
 * they haven't generated one yet. Consumed by the /study-plan page.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("study_plans")
      .select("id, target_grade, exam_date, available_hours_per_week, subjects, priority_subjects, plan, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plan: data?.plan ?? null, meta: data ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load study plan" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/study-plan
 * Generates a new study plan from the submitted goals and persists it,
 * deactivating any previously active plan. Body: StudyGoals.
 *
 * Real topicHints (from topic_mastery -- weak topics only, see route
 * comment below) are threaded through so generateStudyPlan() never has
 * to fabricate a specific-sounding topic name. Curriculum-coverage-based
 * "fresh topic" hints are deliberately not wired here yet -- doing that
 * correctly needs a per-subject exam board/level mapping that doesn't
 * exist in the schema (profiles.study_level is a single value, not
 * per-subject); generateStudyPlan()'s existing honest generic fallback
 * covers this gap without inventing anything. See docs/BLUEPRINT_GAP_MATRIX.md.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const targetGrade = body.targetGrade as StudyGoals["targetGrade"];
    const examDate = body.examDate as string;
    const availableHoursPerWeek = Number(body.availableHoursPerWeek);
    const subjects = Array.isArray(body.subjects) ? (body.subjects as string[]) : [];
    const prioritySubjects = Array.isArray(body.prioritySubjects)
      ? (body.prioritySubjects as string[])
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
    if (!Number.isFinite(availableHoursPerWeek) || availableHoursPerWeek <= 0) {
      return NextResponse.json({ error: "availableHoursPerWeek must be a positive number" }, { status: 400 });
    }
    if (subjects.length === 0) {
      return NextResponse.json({ error: "At least one subject is required" }, { status: 400 });
    }

    // Real weak-topic hints from topic_mastery, grouped by subject. Only
    // the "weak" half is populated here -- see the route-level comment
    // above for why "fresh" is deliberately left for generateStudyPlan()'s
    // existing honest fallback rather than wired to fabricated data.
    const { data: masteryRows } = await supabase
      .from("topic_mastery")
      .select("subject, topic, mastery_score")
      .eq("user_id", user.id)
      .in("subject", subjects)
      .lt("mastery_score", 60);

    const topicHints: StudyPlanInput["topicHints"] = {};
    for (const row of masteryRows ?? []) {
      if (!topicHints[row.subject]) {
        topicHints[row.subject] = { weak: [], fresh: [] };
      }
      topicHints[row.subject].weak.push(row.topic);
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

    // Deactivate any existing active plan(s) before inserting the new one
    // -- one active plan per student, matching how the page reads it back.
    const { error: deactivateError } = await supabase
      .from("study_plans")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (deactivateError) {
      return NextResponse.json({ error: deactivateError.message }, { status: 500 });
    }

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

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ plan: inserted.plan }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate study plan" },
      { status: 500 }
    );
  }
}
