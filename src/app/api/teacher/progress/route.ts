import { NextResponse } from "next/server";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";
const TEACHING_ROLES = ["teacher", "tutor", "administrator", "staff"] as const;

export async function GET(request: Request) {
  const workspace = await getTeacherWorkspace();
  if (!workspace) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const groupId = new URL(request.url).searchParams.get("groupId");
  if (!groupId) return NextResponse.json({ error: "Choose a teaching group." }, { status: 400 });

  const [groupMemberships, institutionMemberships] = await Promise.all([
    workspace.supabase.from("platform_group_members").select("group_id")
      .eq("user_id", workspace.user.id).eq("status", "active")
      .in("membership_role", [...TEACHING_ROLES]),
    workspace.supabase.from("platform_institution_members").select("institution_id")
      .eq("user_id", workspace.user.id).eq("status", "active")
      .eq("membership_role", "administrator"),
  ]);
  if (groupMemberships.error || institutionMemberships.error) {
    return NextResponse.json({ error: "Could not verify your teaching access." }, { status: 500 });
  }

  const assigned = (groupMemberships.data ?? []).some((row) => row.group_id === groupId);
  const institutionIds = (institutionMemberships.data ?? []).map((row) => row.institution_id);
  const { data: group, error: groupError } = await workspace.supabase
    .from("platform_groups").select("id,name,institution_id").eq("id", groupId).maybeSingle();
  if (groupError) return NextResponse.json({ error: "Could not load this class." }, { status: 500 });
  if (!group || (!assigned && (!group.institution_id || !institutionIds.includes(group.institution_id)))) {
    return NextResponse.json({ error: "You are not authorized to view this class." }, { status: 403 });
  }

  const [{ data: roster, error: rosterError }, { data: assignments, error: assignmentError }, { data: sessions, error: sessionError }] = await Promise.all([
    workspace.supabase.rpc("list_platform_group_roster", { p_group_id: groupId }),
    workspace.supabase.from("platform_assignments")
      .select("id,title,subject,max_score,status,created_at")
      .eq("group_id", groupId).order("created_at", { ascending: false }).limit(100),
    workspace.supabase.from("platform_attendance_sessions")
      .select("id,session_date,status").eq("group_id", groupId)
      .order("session_date", { ascending: false }).limit(120),
  ]);
  if (rosterError || assignmentError || sessionError) {
    return NextResponse.json({ error: "Could not load class learning evidence." }, { status: 500 });
  }

  const assignmentIds = (assignments ?? []).map((row) => row.id);
  const sessionIds = (sessions ?? []).map((row) => row.id);
  const [submissionResult, attendanceResult] = await Promise.all([
    assignmentIds.length
      ? workspace.supabase.from("platform_assignment_submissions")
          .select("id,assignment_id,student_id,status,score,submitted_at,marked_at")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [], error: null }),
    sessionIds.length
      ? workspace.supabase.from("platform_attendance_records")
          .select("session_id,student_id,attendance_status")
          .in("session_id", sessionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (submissionResult.error || attendanceResult.error) {
    return NextResponse.json({ error: "Could not load learner evidence." }, { status: 500 });
  }

  const learners = (roster ?? []).filter((row: { membership_role: string }) => row.membership_role === "student");
  const reports = learners.map((learner: { user_id: string; display_name: string }) => {
    const submissions = (submissionResult.data ?? []).filter((row) => row.student_id === learner.user_id);
    const marked = submissions.filter((row) => row.status === "marked" && row.score !== null);
    const possible = marked.reduce((total, row) => {
      const assignment = (assignments ?? []).find((item) => item.id === row.assignment_id);
      return total + Number(assignment?.max_score ?? 0);
    }, 0);
    const earned = marked.reduce((total, row) => total + Number(row.score ?? 0), 0);
    const attendance = (attendanceResult.data ?? []).filter((row) => row.student_id === learner.user_id);
    const eligibleAttendance = attendance.filter((row) => ["present", "late", "absent"].includes(row.attendance_status));
    const attended = eligibleAttendance.filter((row) => ["present", "late"].includes(row.attendance_status)).length;
    return {
      studentId: learner.user_id,
      name: learner.display_name || "Student",
      assignmentsSubmitted: submissions.length,
      assignmentsMarked: marked.length,
      assignmentsAvailable: (assignments ?? []).filter((row) => row.status === "published").length,
      averagePercent: possible > 0 ? Math.round((earned / possible) * 100) : null,
      attendanceRate: eligibleAttendance.length ? Math.round((attended / eligibleAttendance.length) * 100) : null,
      attendanceSessions: attendance.length,
    };
  });

  return NextResponse.json({
    group: { id: group.id, name: group.name },
    evidenceWindow: { assignments: (assignments ?? []).length, attendanceSessions: (sessions ?? []).length },
    learners: reports.sort((a, b) => a.name.localeCompare(b.name)),
  });
}
