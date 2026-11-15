"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type GroupOption = { id: string; name: string; group_type: string };
type PendingGuardianLink = { relationship_id: string; student_user_id: string; student_display_name: string; guardian_user_id: string; guardian_display_name: string; relationship_type: string; requested_at: string };

export function InstitutionAdminPanel({
  institutionId,
  groups,
}: {
  institutionId: string;
  groups: GroupOption[];
}) {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState("class");
  const [inviteRole, setInviteRole] = useState("student");
  const [inviteGroupId, setInviteGroupId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [studentUserId, setStudentUserId] = useState("");
  const [relationshipType, setRelationshipType] = useState("guardian");
  const [guardianInviteCode, setGuardianInviteCode] = useState("");
  const [pendingLinks, setPendingLinks] = useState<PendingGuardianLink[]>([]);

  async function loadGuardianQueue() {
    try {
      const response = await fetch(`/api/platform/guardian-links?institutionId=${encodeURIComponent(institutionId)}`, { cache: "no-store" });
      const result = await response.json();
      if (response.ok) setPendingLinks(result.links ?? []);
    } catch {
      // Keep the rest of the institution workspace usable if the queue is unavailable.
    }
  }

  useEffect(() => { void loadGuardianQueue(); }, [institutionId]);

  async function createGuardianInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setGuardianInviteCode("");
    try {
      const response = await fetch("/api/platform/guardian-links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ institutionId, studentUserId: studentUserId.trim(), relationshipType }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create the family invitation.");
      setGuardianInviteCode(result.code);
      setStudentUserId("");
      setMessage("Student-specific family invitation created. Share it with the intended adult only.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the family invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function reviewGuardianLink(relationshipId: string, approve: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/platform/guardian-links", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ relationshipId, approve }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not review the request.");
      setMessage(approve ? "Family link approved." : "Family link rejected.");
      await loadGuardianQueue();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not review the request.");
    } finally {
      setBusy(false);
    }
  }

  async function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/platform/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ institutionId, name: groupName, groupType }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create the group.");
      setGroupName("");
      setMessage("Group created.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the group.");
    } finally {
      setBusy(false);
    }
  }

  async function createInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setInviteCode("");
    try {
      const response = await fetch("/api/platform/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          institutionId,
          membershipRole: inviteRole,
          groupId: inviteGroupId || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create the invitation.");
      setInviteCode(result.code);
      setMessage("Invitation created. Copy the code now. It will not be shown again.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setMessage("Invitation code copied.");
    } catch {
      setMessage("Copy was blocked by this browser. Select and copy the code manually.");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Institution administration</p>
        <h2 className="mt-1 text-lg font-semibold">Set up classes and invite people</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
          These actions are checked again by the database against your active administrator membership.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form onSubmit={createGroup} className="space-y-3">
          <h3 className="text-sm font-semibold">Create a teaching group</h3>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--muted-foreground)]">Group name</span>
            <input
              required
              maxLength={120}
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="e.g. Form 5A"
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--muted-foreground)]">Group type</span>
            <select
              value={groupType}
              onChange={(event) => setGroupType(event.target.value)}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)]"
            >
              <option value="class">Class</option>
              <option value="cohort">Cohort</option>
              <option value="department">Department</option>
              <option value="programme">Programme</option>
              <option value="course">Course</option>
              <option value="club">Club</option>
            </select>
          </label>
          <button disabled={busy || !groupName.trim()} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Working…" : "Create group"}
          </button>
        </form>

        <form onSubmit={createInvite} className="space-y-3">
          <h3 className="text-sm font-semibold">Create an invitation</h3>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--muted-foreground)]">Invite as</span>
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)]"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="tutor">Tutor</option>
              <option value="parent">Parent</option>
              <option value="guardian">Guardian</option>
              <option value="staff">Staff</option>
              <option value="administrator">Administrator</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--muted-foreground)]">Assign to group (optional)</span>
            <select
              value={inviteGroupId}
              onChange={(event) => setInviteGroupId(event.target.value)}
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)]"
            >
              <option value="">Institution only</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <button disabled={busy} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Working…" : "Generate invitation"}
          </button>
        </form>
      </div>

      <div className="grid gap-5 border-t border-[var(--card-border)] pt-5 lg:grid-cols-2">
        <form onSubmit={createGuardianInvite} className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Link a parent or guardian to one student</h3>
            <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
              Enter the student account ID from their class roster. The adult receives a one-use invitation; access stays pending until your institution verifies and approves the request.
            </p>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--muted-foreground)]">Student account ID</span>
            <input required value={studentUserId} onChange={(event) => setStudentUserId(event.target.value)} placeholder="Student user ID" className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)]" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--muted-foreground)]">Relationship</span>
            <select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-3 py-2.5 text-[var(--foreground)]">
              <option value="parent">Parent</option>
              <option value="guardian">Guardian</option>
            </select>
          </label>
          <button disabled={busy || !studentUserId.trim()} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Working…" : "Create family invitation"}
          </button>
          {guardianInviteCode ? (
            <div className="space-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">One-time family invitation code</p>
              <code className="block break-all text-sm">{guardianInviteCode}</code>
              <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(guardianInviteCode); setMessage("Family invitation copied."); } catch { setMessage("Copy was blocked. Select and copy the code manually."); } }} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium">Copy family invitation</button>
            </div>
          ) : null}
        </form>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Family requests awaiting review</h3>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Approve only after your school has verified the adult's identity and relationship to the learner.</p>
          </div>
          {pendingLinks.length ? pendingLinks.map((link) => (
            <article key={link.relationship_id} className="space-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3">
              <div className="text-sm font-medium">{link.guardian_display_name} · {link.relationship_type}</div>
              <p className="text-xs text-[var(--muted-foreground)]">Student: {link.student_display_name}</p>
              <p className="break-all text-[11px] text-[var(--muted-foreground)]">Guardian account: {link.guardian_user_id}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => void reviewGuardianLink(link.relationship_id, true)} className="rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve</button>
                <button type="button" disabled={busy} onClick={() => void reviewGuardianLink(link.relationship_id, false)} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-xs font-medium disabled:opacity-50">Reject</button>
              </div>
            </article>
          )) : <p className="rounded-xl border border-dashed border-[var(--card-border)] p-3 text-xs text-[var(--muted-foreground)]">No pending family requests.</p>}
        </section>
      </div>

      {inviteCode ? (
        <div className="space-y-2 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3">
          <p className="text-xs font-semibold text-[var(--muted-foreground)]">One-time invitation code</p>
          <code className="block break-all text-sm">{inviteCode}</code>
          <button type="button" onClick={copyInvite} className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm font-medium">
            Copy code
          </button>
        </div>
      ) : null}
      {message ? <p role="status" className="text-sm text-[var(--muted-foreground)]">{message}</p> : null}
    </section>
  );
}
