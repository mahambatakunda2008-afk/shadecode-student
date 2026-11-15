import { NextResponse } from "next/server";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";
const TEACHING_ROLES = ["teacher", "tutor", "administrator", "staff"] as const;

export async function GET(request: Request) {
  const workspace = await getTeacherWorkspace();
  if (!workspace) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const groupId = new URL(request.url).searchParams.get("groupId");
  if (!groupId) return NextResponse.json({ error: "Choose a teaching group." }, { status: 400 });

  const groupMemberships = await workspace.supabase.from("platform_group_members").select("group_id")
    .eq("user_id", workspace.user.id).eq("status", "active")
    .in("membership_role", [...TEACHING_ROLES]);
  if (groupMemberships.error) {
    return NextResponse.json({ error: "Could not verify your teaching access." }, { status: 500 });
  }

  const assigned = (groupMemberships.data ?? []).some((row) => row.group_id === groupId);
  const { data: group, error: groupError } = await workspace.supabase
    .from("platform_groups").select("id,name,institution_id").eq("id", groupId).maybeSingle();
  if (groupError) return NextResponse.json({ error: "Could not load this class." }, { status: 500 });
  if (!group || !assigned) {
    return NextResponse.json({ error: "You are not authorized to view this class." }, { status: 403 });
  }

  const [{ data: roster, error: rosterError }, { data: assignments, error: assignmentError }] = await Promise.all([
    workspace.supabase.rpc("list_platform_group_roster", { p_group_id: groupId }),
    workspace.supabase.from("platform_assignments")
      .select("id,title,subject,max_score,status,created_at")
      .eq("group_id", groupId).order("created_at", { ascending: false }).limit(100),
  ]);
  if (rosterError || assignmentError) {
    return NextResponse.json({ error: "Could not load class learning evidence." }, { status: 500 });
  }

  const assignmentIds = (assignments ?? []).map((row) => row.id);
  const submissions = assignmentIds.length
    ? await workspace.supabase.from("platform_assignment_submissions")
        .select("id,assignment_id,student_id,status,score,submitted_at,marked_at")
        .in("assignment_id", assignmentIds)
    : { data: [], error: null };
  if (submissions.error) return NextResponse.json({ error: "Could not load learner work." }, { status: 500 });

  const learners = (roster ?? [])
    .filter((row: { membership_role: string }) => row.membership_role === "student")
    .map((learner: { user_id: string; display_name: string }) => {
      const work = (submissions.data ?? []).filter((row) => row.student_id === learner.user_id);
      const marked = work.filter((row) => row.status === "marked" && row.score !== null);
      const possible = marked.reduce((total, row) => {
        const assignment = (assignments ?? []).find((item) => item.id === row.assignment_id);
        return total + Number(assignment?.max_score ?? 0);
      }, 0);
      const earned = marked.reduce((total, row) => total + Number(row.score ?? 0), 0);
      return {
        studentId: learner.user_id,
        name: learner.display_name || "Student",
        assignmentsSubmitted: work.length,
        assignmentsMarked: marked.length,
        assignmentsAvailable: (assignments ?? []).filter((row) => row.status === "published").length,
        awaitingMarking: work.filter((row) => row.status === "submitted").length,
        averagePercent: possible > 0 ? Math.round((earned / possible) * 100) : null,
      };
    });

  return NextResponse.json({
    group: { id: group.id, name: group.name },
    evidenceWindow: { assignments: (assignments ?? []).length },
    learners: learners.sort((a, b) => a.name.localeCompare(b.name)),
  });
}
