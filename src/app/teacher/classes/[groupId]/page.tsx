import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";
export const metadata = { title: "Class roster · Shadecode Teacher" };

type RosterMember = {
  user_id: string;
  display_name: string;
  membership_role: string;
  status: string;
  joined_at: string;
};

function titleCase(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function TeacherClassRosterPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const reviewer = await getTeacherWorkspace();
  if (!reviewer) redirect("/");

  const { groupId } = await params;
  const [{ data: group, error: groupError }, { data: roster, error: rosterError }] = await Promise.all([
    reviewer.supabase
      .from("platform_groups")
      .select("id,name,group_type,institution_id")
      .eq("id", groupId)
      .maybeSingle(),
    reviewer.supabase.rpc("list_platform_group_roster", { p_group_id: groupId }),
  ]);

  if (groupError || rosterError) {
    return (
      <div className="space-y-5">
        <Link href="/teacher/classes" className="text-sm text-[var(--primary)] hover:underline">← Back to classes</Link>
        <section role="status" className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h1 className="font-semibold">This class roster isn't available</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Your account may not have an active teaching assignment for this group. Ask the institution administrator to check your access.
          </p>
        </section>
      </div>
    );
  }
  if (!group) notFound();

  const members = (roster ?? []) as RosterMember[];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link href="/teacher/classes" className="text-sm text-[var(--primary)] hover:underline">← Back to classes</Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Class workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{group.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{titleCase(group.group_type)} · {members.length} active members</p>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
          <h2 className="font-semibold">Class roster</h2>
          <span className="text-xs text-[var(--muted-foreground)]">Active assignments only</span>
        </div>
        {members.length ? (
          <ul className="divide-y divide-[var(--card-border)]">
            {members.map((member) => (
              <li key={member.user_id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{member.display_name || "Student"}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{titleCase(member.membership_role)}</p>
                </div>
                <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                  Joined {new Date(member.joined_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-5">
            <h3 className="font-semibold">No active members yet</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Learners and teachers will appear here when their invitations are redeemed.</p>
          </div>
        )}
      </section>
    </div>
  );
}
