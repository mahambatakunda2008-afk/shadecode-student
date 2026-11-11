import Link from "next/link";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { loadLessonItems } from "@/lib/teacher/loadItems";
import { questionItems, REVIEW_GROUPS } from "@/lib/teacher/reviewItems";

export const dynamic = "force-dynamic";
export const metadata = { title: "Teacher portal · Shadecode Student" };

export default async function TeacherHome() {
  const reviewer = (await getReviewer())!;
  const [lessons, { data: rows }] = await Promise.all([
    loadLessonItems(reviewer.supabase),
    reviewer.supabase.from("content_reviews").select("question_id,verdict,reviewer_id").limit(10000),
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

  const totalLeft = cards.reduce((n, c) => n + (c.total - c.reviewed), 0);

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-xl font-semibold">Teacher portal</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {totalLeft > 0 ? `${totalLeft} items are waiting for your review.` : "You have reviewed everything available. Thank you."}
        </p>
      </section>

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
    </div>
  );
}
