import { NextResponse } from "next/server";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";
const TEACHING_ROLES = ["teacher", "tutor", "administrator", "staff"] as const;

async function getTeachingGroups(workspace: NonNullable<Awaited<ReturnType<typeof getTeacherWorkspace>>>) {
  const { data: memberships, error: membershipError } = await workspace.supabase
    .from("platform_group_members").select("group_id,membership_role")
    .eq("user_id", workspace.user.id).eq("status", "active")
    .in("membership_role", [...TEACHING_ROLES]);
  if (membershipError) throw new Error("Could not verify teaching groups.");
  const ids = [...new Set((memberships ?? []).map((row) => row.group_id))];
  if (!ids.length) return [];
  const { data, error } = await workspace.supabase
    .from("platform_groups").select("id,name,group_type,institution_id").in("id", ids).order("name");
  if (error) throw new Error("Could not load teaching groups.");
  return data ?? [];
}

export async function GET(request: Request) {
  const workspace = await getTeacherWorkspace();
  if (!workspace) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const groups = await getTeachingGroups(workspace);
    const groupId = new URL(request.url).searchParams.get("groupId");
    const selected = groupId ? groups.filter((group) => group.id === groupId) : groups;
    if (groupId && !selected.length) return NextResponse.json({ error: "You are not assigned to teach this class." }, { status: 403 });
    const ids = selected.map((group) => group.id);
    if (!ids.length) return NextResponse.json({ groups, sessions: [], records: [], roster: [] });

    const { data: sessions, error: sessionError } = await workspace.supabase
      .from("platform_attendance_sessions")
      .select("id,group_id,created_by,session_date,subject,lesson_topic,status,created_at,closed_at")
      .in("group_id", ids).order("session_date", { ascending: false }).order("created_at", { ascending: false }).limit(60);
    if (sessionError) return NextResponse.json({ error: "Could not load attendance registers." }, { status: 500 });
    const sessionIds = (sessions ?? []).map((session) => session.id);
    const [{ data: records, error: recordsError }, rosterResults] = await Promise.all([
      sessionIds.length
        ? workspace.supabase.from("platform_attendance_records")
            .select("id,session_id,student_id,attendance_status,note,recorded_at")
            .in("session_id", sessionIds)
        : Promise.resolve({ data: [], error: null }),
      groupId
        ? workspace.supabase.rpc("list_platform_group_roster", { p_group_id: groupId })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (recordsError) return NextResponse.json({ error: "Could not load attendance records." }, { status: 500 });
    if (rosterResults.error) return NextResponse.json({ error: "Could not load this class roster." }, { status: 500 });
    return NextResponse.json({ groups, sessions: sessions ?? [], records: records ?? [], roster: rosterResults.data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load attendance." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const workspace = await getTeacherWorkspace();
  if (!workspace) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid attendance request." }, { status: 400 });

  if (body.action === "create-session") {
    if (typeof body.groupId !== "string" || typeof body.subject !== "string" ||
        (body.lessonTopic !== undefined && typeof body.lessonTopic !== "string")) {
      return NextResponse.json({ error: "A class and subject are required." }, { status: 400 });
    }
    const subject = body.subject.trim();
    const lessonTopic = typeof body.lessonTopic === "string" ? body.lessonTopic.trim() : "";
    if (!subject || subject.length > 120 || lessonTopic.length > 500) {
      return NextResponse.json({ error: "Check the subject and lesson topic." }, { status: 400 });
    }
    const date = typeof body.sessionDate === "string" ? body.sessionDate : new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + "T00:00:00Z"))) {
      return NextResponse.json({ error: "Choose a valid register date." }, { status: 400 });
    }
    const { data, error } = await workspace.supabase.rpc("create_platform_attendance_session", {
      p_group_id: body.groupId, p_session_date: date, p_subject: subject, p_lesson_topic: lessonTopic,
    });
    if (error) return NextResponse.json({ error: error.code === "42501" ? "You need an active teaching assignment for this class." : "Could not create the register." }, { status: error.code === "42501" ? 403 : 400 });
    return NextResponse.json({ id: data }, { status: 201 });
  }

  if (body.action === "record") {
    if (typeof body.sessionId !== "string" || typeof body.studentId !== "string" ||
        !["present", "absent", "late", "excused"].includes(body.status) ||
        (body.note !== undefined && typeof body.note !== "string") || (body.note ?? "").length > 1000) {
      return NextResponse.json({ error: "Check the attendance entry." }, { status: 400 });
    }
    const { data, error } = await workspace.supabase.rpc("record_platform_attendance", {
      p_session_id: body.sessionId, p_student_id: body.studentId, p_status: body.status, p_note: body.note ?? "",
    });
    if (error) return NextResponse.json({ error: error.code === "42501" ? "You cannot record attendance for this learner." : "Could not save attendance." }, { status: error.code === "42501" ? 403 : 400 });
    return NextResponse.json({ id: data });
  }

  return NextResponse.json({ error: "Unknown attendance action." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const workspace = await getTeacherWorkspace();
  if (!workspace) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || body.action !== "close-session" || typeof body.sessionId !== "string") {
    return NextResponse.json({ error: "Invalid register update." }, { status: 400 });
  }
  const { data, error } = await workspace.supabase.rpc("close_platform_attendance_session", { p_session_id: body.sessionId });
  if (error) return NextResponse.json({ error: "Could not close this register." }, { status: 400 });
  if (data !== true) return NextResponse.json({ error: "Register is already closed or you do not have permission." }, { status: 409 });
  return NextResponse.json({ success: true });
}
