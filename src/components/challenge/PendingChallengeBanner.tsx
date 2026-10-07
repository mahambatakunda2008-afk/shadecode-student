"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { challengeAcceptUrl, clearPendingChallenge, readPendingChallenge, type ChallengeLinkInput } from "@/lib/challenge/pending";

/**
 * Shown on the dashboard when a friend accepted a challenge before they had an
 * account. Loads the challenge from the public read API, so no private data.
 */
export default function PendingChallengeBanner() {
  const [challenge, setChallenge] = useState<ChallengeLinkInput | null>(null);

  useEffect(() => {
    const id = readPendingChallenge();
    if (!id) return;
    let cancelled = false;
    fetch(`/api/challenge?id=${encodeURIComponent(id)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Partial<ChallengeLinkInput> | null) => {
        if (cancelled) return;
        if (!data) { clearPendingChallenge(); return; }
        setChallenge({
          id,
          subject: data.subject ?? null,
          difficulty: data.difficulty ?? null,
          question_count: data.question_count ?? null,
          percentage: data.percentage ?? null,
          grade: data.grade ?? null,
          challenger_name: data.challenger_name ?? null,
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  if (!challenge) return null;
  const name = challenge.challenger_name ?? "A friend";

  return (
    <aside
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-2xl border border-white/10 bg-[var(--card)] p-4 shadow-lg backdrop-blur"
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">{name} challenged you{challenge.subject ? ` on ${challenge.subject}` : ""}</p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">Beat {challenge.percentage ?? 0}%. You both answer the same questions.</p>
      <div className="mt-3 flex gap-2">
        <Link
          href={challengeAcceptUrl(challenge)}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
        >
          Start the battle
        </Link>
        <button
          type="button"
          onClick={() => { clearPendingChallenge(); setChallenge(null); }}
          className="inline-flex h-10 items-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-white/5"
        >
          Not now
        </button>
      </div>
    </aside>
  );
}
