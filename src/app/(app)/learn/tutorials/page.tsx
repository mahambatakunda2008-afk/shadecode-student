"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import TeacherVerifiedBadge from "@/components/learn/TeacherVerifiedBadge";
import type { TutorialSummary } from "@/components/learn/TeacherTutorials";

export default function TeacherTutorialsPage() {
  const [items, setItems] = useState<TutorialSummary[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/learn/tutorials/browse", { cache: "no-store" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || "Teacher tutorials are unavailable right now.");
        return body;
      })
      .then((body) => {
        if (!active) return;
        setItems(Array.isArray(body.tutorials) ? body.tutorials : []);
        setSubjects(Array.isArray(body.subjects) ? body.subjects : []);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : "Teacher tutorials are unavailable right now."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => (subject === "all" ? items : items.filter((i) => i.subject === subject)), [items, subject]);
  const withTutorials = useMemo(() => subjects.filter((s) => items.some((i) => i.subject === s)), [subjects, items]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">Teacher tutorials</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Explanations, sketches and videos made by teachers and checked by other teachers before you see them.</p>
      </header>

      {withTutorials.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Subject">
          {["all", ...withTutorials].map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={subject === s}
              onClick={() => setSubject(s)}
              className={`whitespace-nowrap rounded-2xl border px-4 py-2 text-sm transition ${subject === s ? "border-[var(--primary)] bg-[var(--primary-glow)] font-semibold" : "border-[var(--card-border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
            >
              {s === "all" ? "All subjects" : s}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Loader2 size={16} className="animate-spin" />Loading tutorials…</p>}
      {error && <p role="status" className="text-sm text-[var(--danger)]">{error}</p>}

      {!loading && !error && visible.length === 0 && (
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted-foreground)]">
          No teacher tutorials for your subjects yet. Check back soon.
        </div>
      )}

      <ul className="space-y-3">
        {visible.map((t) => (
          <li key={t.id}>
            <Link
              href={`/learn/tutorials/${t.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm transition hover:border-[var(--primary)]"
            >
              <span className="min-w-0 space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">{t.subject}{t.topic ? ` · ${t.topic}` : ""}</span>
                <strong className="block text-sm">{t.title}</strong>
                {t.summary && <span className="block text-xs leading-5 text-[var(--muted-foreground)]">{t.summary}</span>}
                <TeacherVerifiedBadge compact verifiedAt={t.verified_at} />
              </span>
              <ChevronRight size={16} className="shrink-0 text-[var(--muted-foreground)]" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
