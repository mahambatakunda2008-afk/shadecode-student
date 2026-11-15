"use client";

import { useEffect, useMemo, useState } from "react";

type Group = { id: string; name: string; group_type: string; institution_id: string | null };
type Session = { id: string; group_id: string; session_date: string; subject: string; lesson_topic: string; status: "open" | "closed"; created_at: string };
type Learner = { user_id: string; display_name: string; membership_role: string };
type RecordRow = { id: string; session_id: string; student_id: string; attendance_status: "present" | "absent" | "late" | "excused"; note: string };
const STATUSES = [
  { value: "present", label: "Present" }, { value: "absent", label: "Absent" },
  { value: "late", label: "Late" }, { value: "excused", label: "Excused" },
] as const;

export function AttendanceClient() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [roster, setRoster] = useState<Learner[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [subject, setSubject] = useState("");
  const [lessonTopic, setLessonTopic] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null;
  const groupSessions = useMemo(() => sessions.filter((session) => session.group_id === groupId), [sessions, groupId]);
  const sessionRecords = useMemo(() => records.filter((record) => record.session_id === selectedSessionId), [records, selectedSessionId]);
  const recordByStudent = useMemo(() => new Map(sessionRecords.map((record) => [record.student_id, record])), [sessionRecords]);

  async function load(nextGroupId = groupId) {
    setLoading(true); setError("");
    try {
      const response = await fetch(nextGroupId ? `/api/teacher/attendance?groupId=${encodeURIComponent(nextGroupId)}` : "/api/teacher/attendance", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load attendance.");
      setGroups(payload.groups ?? []);
      setSessions(payload.sessions ?? []);
      setRecords(payload.records ?? []);
      setRoster(payload.roster ?? []);
      const chosenGroup = nextGroupId || payload.groups?.[0]?.id || "";
      setGroupId(chosenGroup);
      const available = (payload.sessions ?? []).filter((session: Session) => session.group_id === chosenGroup);
      setSelectedSessionId((current) => available.some((session: Session) => session.id === current) ? current : available[0]?.id ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load attendance.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(""); }, []);

  async function send(body: Record<string, unknown>, method = "POST") {
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/teacher/attendance", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Attendance update failed.");
      setNotice("Attendance saved.");
      await load(groupId);
      if (payload.id && body.action === "create-session") setSelectedSessionId(payload.id as string);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Attendance update failed.");
    } finally { setSaving(false); }
  }

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await send({ action: "create-session", groupId, subject, lessonTopic, sessionDate });
    setSubject(""); setLessonTopic("");
  }

  async function setAttendance(studentId: string, status: string) {
    if (!selectedSession) return;
    await send({ action: "record", sessionId: selectedSession.id, studentId, status });
  }

  const presentCount = sessionRecords.filter((record) => record.attendance_status === "present").length;
  const absentCount = sessionRecords.filter((record) => record.attendance_status === "absent").length;
  const unmarkedCount = Math.max(0, roster.filter((member) => member.membership_role === "student").length - sessionRecords.length);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
        <div className="mb-4"><h2 className="text-lg font-semibold">Start a register</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Create a dated attendance session for one of your active teaching groups.</p></div>
        {groups.length ? <form onSubmit={createSession} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm"><span className="font-medium">Class</span><select required value={groupId} onChange={(event) => { setGroupId(event.target.value); void load(event.target.value); }} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5">{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
          <label className="space-y-1.5 text-sm"><span className="font-medium">Date</span><input required type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" /></label>
          <label className="space-y-1.5 text-sm"><span className="font-medium">Subject</span><input required maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Physics" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" /></label>
          <label className="space-y-1.5 text-sm"><span className="font-medium">Lesson topic (optional)</span><input maxLength={500} value={lessonTopic} onChange={(event) => setLessonTopic(event.target.value)} placeholder="e.g. Wave properties" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5" /></label>
          <div className="sm:col-span-2"><button disabled={saving || !groupId} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Create register"}</button></div>
        </form> : <p className="rounded-xl border border-dashed border-[var(--card-border)] p-4 text-sm text-[var(--muted-foreground)]">No active teaching groups are assigned yet.</p>}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">Attendance register</h2><p className="text-sm text-[var(--muted-foreground)]">Mark learners, correct entries while open, then close the register.</p></div>
          {groupSessions.length ? <label className="min-w-48 space-y-1 text-sm"><span className="font-medium">Session</span><select value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5">{groupSessions.map((session) => <option key={session.id} value={session.id}>{session.session_date} · {session.subject}</option>)}</select></label> : null}
        </div>
        {loading ? <p className="text-sm text-[var(--muted-foreground)]">Loading register…</p> : selectedSession ? <>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{selectedSession.subject}</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">{selectedSession.session_date}{selectedSession.lesson_topic ? ` · ${selectedSession.lesson_topic}` : ""}</p></div><span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs">{selectedSession.status === "open" ? "Open" : "Closed"}</span></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-[var(--surface)] p-3"><p className="text-xl font-semibold">{presentCount}</p><p className="text-xs text-[var(--muted-foreground)]">Present</p></div><div className="rounded-xl bg-[var(--surface)] p-3"><p className="text-xl font-semibold">{absentCount}</p><p className="text-xs text-[var(--muted-foreground)]">Absent</p></div><div className="rounded-xl bg-[var(--surface)] p-3"><p className="text-xl font-semibold">{unmarkedCount}</p><p className="text-xs text-[var(--muted-foreground)]">Unmarked</p></div></div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
            {roster.filter((member) => member.membership_role === "student").length ? <ul className="divide-y divide-[var(--card-border)]">{roster.filter((member) => member.membership_role === "student").map((learner) => {
              const record = recordByStudent.get(learner.user_id);
              return <li key={learner.user_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-medium">{learner.display_name || "Student"}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{record ? `Marked ${record.attendance_status}` : "Not marked yet"}</p></div><div className="flex flex-wrap gap-1.5">{STATUSES.map((status) => <button key={status.value} type="button" disabled={saving || selectedSession.status === "closed"} aria-pressed={record?.attendance_status === status.value} onClick={() => void setAttendance(learner.user_id, status.value)} className={`rounded-lg border px-2.5 py-2 text-xs font-medium disabled:opacity-40 ${record?.attendance_status === status.value ? "border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--primary)]" : "border-[var(--card-border)] hover:bg-[var(--surface)]"}`}>{status.label}</button>)}</div></li>;
            })}</ul> : <p className="p-5 text-sm text-[var(--muted-foreground)]">No active learners are assigned to this class.</p>}
          </div>
          {selectedSession.status === "open" ? <button type="button" disabled={saving} onClick={() => void send({ action: "close-session", sessionId: selectedSession.id }, "PATCH")} className="rounded-xl border border-[var(--card-border)] px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Close register</button> : <p className="text-sm text-[var(--muted-foreground)]">This register is closed. Its entries are read-only.</p>}
        </> : <p className="rounded-xl border border-dashed border-[var(--card-border)] p-5 text-sm text-[var(--muted-foreground)]">No register for this class yet. Start one above.</p>}
      </section>
      {error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm">{error}</p> : null}
      {notice ? <p role="status" className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary-glow)] p-3 text-sm">{notice}</p> : null}
    </div>
  );
}
