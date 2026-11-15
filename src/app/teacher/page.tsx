import Link from "next/link";
import { redirect } from "next/navigation";
import { getReviewer, getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";
import { loadLessonItems } from "@/lib/teacher/loadItems";
import { questionItems, REVIEW_GROUPS } from "@/lib/teacher/reviewItems";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teacher portal · Shadecode Student" };

const TEACHING_ROLES = ["teacher", "tutor", "administrator", "staff"] as const;

export default async function TeacherHome() {
  const workspace = await getTeacherWorkspace();
  if (!workspace) redirect("/");
  const reviewer = await getReviewer();

  if (!reviewer) {
    const [institutions, groups] = await Promise.all([
      workspace.supabase
        .from("platform_institution_members")
        .select("institution_id", { count: "exact", head: true })
        .eq("user_id", workspace.user.id)
        .eq("status", "active")
        .in("membership_role", [...TEACHING_ROLES]),
      workspace.supabase
        .from("platform_group_members")
        .select("group_id", { count: "exact", head: true })
        .eq("user_id", workspace.user.id)
        .eq("status", "active")
        .in("membership_role", [...TEACHING_ROLES]),
    ]);
    return (
      <div className="space-y-7">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Shadecode Teacher</p>
          <h1 className="text-2xl font-semibold tracking-tight">Your teaching workspace</h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Your institution access is active. Your school classes and learner roster are kept separate from global content-review permissions.
          </p>
        </header>
        <section className="grid gap-3 sm:grid-cols-2">
          <Link href="/teacher/classes" className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition hover:border-[var(--primary)]">
            <p className="text-xs text-[var(--muted-foreground)]">Institutions</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{institutions.error ? "—" : institutions.count ?? 0}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Open your school workspace</p>
          </Link>
          <Link href="/teacher/classes" className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition hover:border-[var(--primary)]">
            <p className="text-xs text-[var(--muted-foreground)]">Teaching groups</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{groups.error ? "—" : groups.count ?? 0}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">View assigned classes</p>
          </Link>
        </section>
      </div>
    );
  }

  const [lessons, { data: rows }, institutionMemberships, groupMemberships] = await Promise.all([
    loadLessonItems(reviewer.supabase),
    reviewer.supabase.from("content_reviews").select("question_id,verdict,reviewer_id").limit(10000),
    reviewer.supabase.from("platform_institution_members").select("institution_id").eq("user_id", reviewer.user.id).eq("status", "active").in("membership_role", [...TEACHING_ROLES]),
    reviewer.supabase.from("platform_group_members").select("group_id").eq("user_id", reviewer.user.id).eq("status", "active").in("membership_role", [...TEACHING_ROLES]),
  ]);

  const items = [...questionItems(), ...lessons];
  const reviews = rows ?? [];
  const mine = new Map(reviews.filter((r) => r.reviewer_id === reviewer.user.id).map((r) => [r.question_id as string, r.verdict as string]));
  const flaggedByAnyone = new Set(reviews.filter((r) => r.verdict !== "correct").map((r) => r.question_id as string));

  const cards = REVIEW_GROUPS.map((g) => {
    const inGroup = items.filter((i) => i.group === g.id);
    return {
      ...g,
      total: inGroup.length,
      reviewed: inGroup.filter((i) => mine.has(i.id)).length,
      flagged: inGroup.filter((i) => flaggedByAnyone.has(i.id)).length,
    };
  }).filter((c) => c.total > 0);

  const { count: tutorialsWaiting } = await reviewer.supabase
    .from("teacher_tutorials")
    .select("id", { count: "exact", head: true })
    .eq("status", "in_review")
    .neq("author_id", reviewer.user.id);

  const totalLeft = cards.reduce((n, c) => n + (c.total - c.reviewed), 0);

  const institutionCount = institutionMemberships.error ? null : institutionMemberships.data?.length ?? 0;
  const groupCount = groupMemberships.error ? null : groupMemberships.data?.length ?? 0;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Shadecode Teacher</p>
        <h1 className="text-2xl font-semibold tracking-tight">Your teaching workspace</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
          Your classes, teaching resources and content review work, connected to the same learning platform your students use.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Teaching overview">
        <Link href="/teacher/classes" className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition hover:border-[var(--primary)]">
          <p className="text-xs text-[var(--muted-foreground)]">Teaching groups</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{groupCount ?? "—"}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">View your classes</p>
        </Link>
        <Link href="/teacher/classes" className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition hover:border-[var(--primary)]">
          <p className="text-xs text-[var(--muted-foreground)]">Institutions</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{institutionCount ?? "—"}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Manage your school context</p>
        </Link>
        <Link href="/teacher/tutorials" className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 transition hover:border-[var(--primary)]">
          <p className="text-xs text-[var(--muted-foreground)]">Tutorial Studio</p>
          <p className="mt-2 text-xl font-semibold">Create resources</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Build lessons, diagrams and learning materials</p>
        </Link>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Content review</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {totalLeft > 0 ? `${totalLeft} items are waiting for your review.` : "You have reviewed everything available. Thank you."}
          </p>
        </div>
      <Link
        href="/teacher/tutorials/review"
        className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm transition hover:border-[var(--primary)]"
      >
        <span>
          <span className="block font-medium">Tutorials awaiting review</span>
          <span className="block text-xs text-[var(--muted-foreground)]">Check other teachers’ tutorials before they go to students.</span>
        </span>
        <span className="shrink-0 rounded-full bg-[var(--primary-glow)] px-3 py-1 text-sm font-semibold">{tutorialsWaiting ?? 0}</span>
      </Link>

      <section className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => {
          const pct = Math.round((c.reviewed / c.total) * 100);
          return (
            <Link
              key={c.id}
              href={`/teacher/review?group=${c.id}`}
              className="space-y-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm transition hover:border-[var(--primary)]"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="font-medium">{c.label}</h2>
                <span className="text-xs text-[var(--muted-foreground)]">{c.reviewed} / {c.total}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--brand-gradient)" }} />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">{c.flagged > 0 ? `${c.flagged} flagged by reviewers` : "No flags"}</p>
            </Link>
          );
        })}
      </section>
      </section>
    </div>
  );
}
