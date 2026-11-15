import { NextResponse } from "next/server";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";
const TEACHING_ROLES = ["teacher", "tutor", "administrator", "staff"] as const;

export async function GET() {
  const workspace = await getTeacherWorkspace();
  if (!workspace) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const memberships = await workspace.supabase
    .from("platform_group_members")
    .select("group_id")
    .eq("user_id", workspace.user.id)
    .eq("status", "active")
    .in("membership_role", [...TEACHING_ROLES]);
  if (memberships.error) return NextResponse.json({ error: "Could not load teaching groups." }, { status: 500 });

  const groupIds = [...new Set((memberships.data ?? []).map((row) => row.group_id))];
  const [groupResult, institutionMemberships] = await Promise.all([
    groupIds.length
      ? workspace.supabase.from("platform_groups").select("id,name,institution_id").in("id", groupIds)
      : Promise.resolve({ data: [], error: null }),
    workspace.supabase.from("platform_institution_members").select("institution_id")
      .eq("user_id", workspace.user.id).eq("status", "active")
      .in("membership_role", [...TEACHING_ROLES]),
  ]);
  if (groupResult.error || institutionMemberships.error) {
    return NextResponse.json({ error: "Could not verify teaching groups." }, { status: 500 });
  }
  const institutionIds = new Set((institutionMemberships.data ?? []).map((row) => row.institution_id));
  const groups = (groupResult.data ?? [])
    .filter((group) => !group.institution_id || institutionIds.has(group.institution_id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const authorizedGroupIds = groups.map((group) => group.id);
  if (!authorizedGroupIds.length) return NextResponse.json({ assignments: [], groups: [] });

  const assignmentsResult = await workspace.supabase
    .from("platform_assignments")
    .select("id,group_id,created_by,title,subject,instructions,due_at,max_score,status,assessment_type,created_at")
    .in("group_id", authorizedGroupIds)
    .order("created_at", { ascending: false })
    .limit(100);
  if (assignmentsResult.error) return NextResponse.json({ error: "Could not load classwork." }, { status: 500 });
  return NextResponse.json({ groups, assignments: assignmentsResult.data ?? [] });
}

export async function POST(request: Request) {
  const workspace = await getTeacherWorkspace();
  if (!workspace) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.groupId !== "string" || typeof body.title !== "string" || typeof body.subject !== "string") {
    return NextResponse.json({ error: "A class, title and subject are required." }, { status: 400 });
  }

  const memberships = await workspace.supabase.from("platform_group_members").select("group_id")
    .eq("user_id", workspace.user.id).eq("status", "active")
    .in("membership_role", [...TEACHING_ROLES]);
  if (memberships.error) return NextResponse.json({ error: "Could not verify your teaching access." }, { status: 500 });
  if (!(memberships.data ?? []).some((row) => row.group_id === body.groupId)) {
    return NextResponse.json({ error: "You are not assigned to teach this class." }, { status: 403 });
  }

  const title = body.title.trim();
  const subject = body.subject.trim();
  const instructions = typeof body.instructions === "string" ? body.instructions : "";
  const maxScore = Number(body.maxScore ?? 100);
  const dueAt = body.dueAt ? new Date(body.dueAt) : null;
  const assessmentType = ["assignment", "quiz", "test", "examination", "practical"].includes(body.assessmentType)
    ? body.assessmentType : "assignment";
  const questions = Array.isArray(body.questions) ? body.questions : [];
  const markScheme = Array.isArray(body.markScheme) ? body.markScheme : [];
  if (title.length < 3 || title.length > 180 || !subject || subject.length > 120 ||
      instructions.length > 12000 || !Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 100000 ||
      (body.dueAt && (!dueAt || Number.isNaN(dueAt.getTime()))) || questions.length < 1 || questions.length > 100 || markScheme.length > 200) {
    return NextResponse.json({ error: "Check the assignment details and try again." }, { status: 400 });
  }

  const { data, error } = await workspace.supabase.rpc("create_platform_assessment", {
    p_group_id: body.groupId,
    p_title: title,
    p_subject: subject,
    p_instructions: instructions,
    p_due_at: dueAt?.toISOString() ?? null,
    p_max_score: maxScore,
    p_publish: body.publish === true,
    p_assessment_type: assessmentType,
    p_questions: questions,
    p_mark_scheme: markScheme,
  });
  if (error) {
    const forbidden = error.code === "42501";
    return NextResponse.json({ error: forbidden ? "You need an active teaching assignment for this class." : "Could not create the assignment." }, { status: forbidden ? 403 : 400 });
  }
  return NextResponse.json({ id: data }, { status: 201 });
}
