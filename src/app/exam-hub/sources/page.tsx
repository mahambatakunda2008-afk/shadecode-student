'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Source = {
  id: string;
  board: string;
  syllabus_id: string | null;
  title: string;
  source_url: string;
  source_kind: string;
  access_mode: string;
  rights_note: string | null;
  year: number | null;
  session: string | null;
  paper_number: number | null;
  variant: number | null;
  last_verified_at: string | null;
};

export default function ExamSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/exam-hub/sources')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load sources');
        return response.json();
      })
      .then((payload) => {
        if (active) setSources(Array.isArray(payload.sources) ? payload.sources : []);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load sources');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <Link href="/exam-hub" className="text-sm opacity-70 hover:opacity-100">← Exam Hub</Link>
        <h1 className="mt-3 text-3xl font-bold">Internet Paper Library</h1>
        <p className="mt-2 max-w-2xl text-sm opacity-70">
          Find verified exam-board sources online. Shadecode links to the publisher or board rather than copying copyrighted papers into the app unless we have an explicit right to do so.
        </p>
      </div>

      {loading && <div className="rounded-2xl border p-6">Loading verified sources…</div>}
      {error && <div className="rounded-2xl border border-red-500/30 p-6 text-red-500">{error}</div>}
      {!loading && !error && sources.length === 0 && (
        <div className="rounded-2xl border p-6">No verified online sources are available yet.</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {sources.map((source) => (
          <article key={source.id} className="rounded-2xl border p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border px-2 py-1 text-xs">{source.board}</span>
              {source.syllabus_id && <span className="text-xs opacity-60">{source.syllabus_id}</span>}
            </div>
            <h2 className="mt-4 font-semibold">{source.title}</h2>
            <p className="mt-2 text-xs opacity-60">
              {source.access_mode === 'external_link' ? 'External official source' : source.access_mode}
              {source.last_verified_at ? ` · verified ${new Date(source.last_verified_at).toLocaleDateString()}` : ''}
            </p>
            {source.rights_note && <p className="mt-3 text-xs opacity-60">{source.rights_note}</p>}
            <a
              href={source.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex rounded-xl border px-4 py-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5"
            >
              Open source ↗
            </a>
          </article>
        ))}
      </div>
    </main>
  );
}
