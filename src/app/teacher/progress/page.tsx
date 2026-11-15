import { redirect } from "next/navigation";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";
import { ProgressClient } from "./ProgressClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Learner progress · Shadecode Teacher" };

const TEACHING_ROLES = ["teacher", "tutor", "administrator", "staff"] as const;

export default async function TeacherProgressPage() {
  const workspace = await getTeacherWorkspace();
  if (!workspace) redirect("/");

  const [groupMemberships, institutionMemberships] = await Promise.all([
    workspace.supabase.from("platform_group_members").select("group_id")
      .eq("user_id", workspace.user.id).eq("status", "active")
      .in("membership_role", [...TEACHING_ROLES]),
    workspace.supabase.from("platform_institution_members").select("institution_id")
      .eq("user_id", workspace.user.id).eq("status", "active")
      .eq("membership_role", "administrator"),
  ]);

  const groupIds = [...new Set((groupMemberships.data ?? []).map((row) => row.group_id))];
  const institutionIds = [...new Set((institutionMemberships.data ?? []).map((row) => row.institution_id))];
  const [assignedGroups, adminGroups] = await Promise.all([
    groupIds.length
      ? workspace.supabase.from("platform_groups").select("id,name").in("id", groupIds)
      : Promise.resolve({ data: [], error: null }),
    institutionIds.length
      ? workspace.supabase.from("platform_groups").select("id,name").in("institution_id", institutionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const groups = [...new Map([...(assignedGroups.data ?? []), ...(adminGroups.data ?? [])]
    .map((group) => [group.id, group])).values()]
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Teaching workspace</p>
        <h1 className="text-2xl font-semibold tracking-tight">Learner progress</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
          Review evidence from classwork and attendance to understand how learners are progressing and where they may need support.
        </p>
      </header>
      {groupMemberships.error || institutionMemberships.error || assignedGroups.error || adminGroups.error
        ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">We could not load your teaching groups. Your access has not changed.</p>
        : <ProgressClient groups={groups} />}
    </div>
  );
}
