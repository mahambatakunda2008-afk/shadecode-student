import { NextResponse } from "next/server";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";
const TEACHING_ROLES = ["teacher", "tutor", "administrator", "staff"] as const;

export async function GET(_request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const workspace = await getTeacherWorkspace();
  if (!workspace) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { assignmentId } = await params;

  const { data: assignment, error: assignmentError } = await workspace.supabase
    .from("platform_assignments")
    .select("id,group_id,title,subject,instructions,due_at,max_score,status,assessment_type,questions,mark_scheme")
    .eq("id", assignmentId)
    .maybeSingle();
  if (assignmentError) return NextResponse.json({ error: "Could not load assignment." }, { status: 500 });
  if (!assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  const { data: membership, error: membershipError } = await workspace.supabase
    .from("platform_group_members")
    .select("group_id")
    .eq("group_id", assignment.group_id)
    .eq("user_id", workspace.user.id)
    .eq("status", "active")
    .in("membership_role", [...TEACHING_ROLES])
    .maybeSingle();
  if (membershipError || !membership) return NextResponse.json({ error: "You are not assigned to teach this class." }, { status: 403 });

  const [{ data: group }, { data: submissions, error: submissionsError }] = await Promise.all([
    workspace.supabase.from("platform_groups").select("id,name").eq("id", assignment.group_id).maybeSingle(),
    workspace.supabase
      .from("platform_assignment_submissions")
      .select("id,student_id,response,submitted_at,status,score,feedback,marked_at")
      .eq("assignment_id", assignmentId)
      .order("submitted_at", { ascending: false }),
  ]);
  if (submissionsError) return NextResponse.json({ error: "Could not load submissions." }, { status: 500 });

  const { data: roster } = await workspace.supabase.rpc("list_platform_group_roster", {
    p_group_id: assignment.group_id,
  });
  const names = new Map((roster ?? []).map((member: { user_id: string; display_name: string }) => [
    member.user_id,
    member.display_name,
  ]));
  return NextResponse.json({
    assignment,
    group,
    submissions: (submissions ?? []).map((submission) => ({
      ...submission,
      student_name: names.get(submission.student_id) || "Student",
    })),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ assignmentId: string }> }) {
  const workspace = await getTeacherWorkspace();
  if (!workspace) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { assignmentId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.submissionId !== "string" || !Number.isFinite(Number(body.score)) ||
      Number(body.score) < 0 || typeof body.feedback !== "string" || body.feedback.length > 5000) {
    return NextResponse.json({ error: "A valid score and feedback are required." }, { status: 400 });
  }

  const { data: assignment, error: assignmentError } = await workspace.supabase
    .from("platform_assignments").select("id,group_id,max_score").eq("id", assignmentId).maybeSingle();
  if (assignmentError || !assignment) return NextResponse.json({ error: "Assignment not found." }, { status: 404 });

  const { data: membership } = await workspace.supabase
    .from("platform_group_members").select("group_id")
    .eq("group_id", assignment.group_id).eq("user_id", workspace.user.id)
    .eq("status", "active").in("membership_role", [...TEACHING_ROLES]).maybeSingle();
  if (!membership) return NextResponse.json({ error: "You are not assigned to teach this class." }, { status: 403 });

  const { data, error } = await workspace.supabase.rpc("mark_platform_assignment_submission", {
    p_submission_id: body.submissionId,
    p_score: Number(body.score),
    p_feedback: body.feedback,
  });
  if (error) return NextResponse.json({ error: error.code === "42501" ? "Marking permission denied." : "Could not save marking." }, { status: error.code === "42501" ? 403 : 400 });
  if (data !== true) return NextResponse.json({ error: "Submission could not be marked. Check its score and status." }, { status: 409 });
  return NextResponse.json({ success: true });
}
