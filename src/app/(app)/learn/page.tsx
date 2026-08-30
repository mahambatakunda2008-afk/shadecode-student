import { Suspense } from "react";
import LearnPageClient from "./LearnPageClient";

function LearnFallback() {
  return (
    <main className="min-h-[calc(100vh-1rem)] bg-[var(--background)] p-4 sm:p-6 lg:p-8" aria-busy="true" aria-label="Loading Learn">
      <div className="mx-auto w-full max-w-6xl space-y-5 animate-pulse">
        <div className="space-y-2"><div className="h-8 w-40 rounded-lg bg-[var(--muted)]" /><div className="h-4 w-72 max-w-full rounded bg-[var(--muted)]" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((item)=><div key={item} className="h-32 rounded-2xl border border-[var(--card-border)] bg-[var(--card)]" />)}</div>
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"><div className="h-72 rounded-2xl border border-[var(--card-border)] bg-[var(--card)]" /><div className="h-72 rounded-2xl border border-[var(--card-border)] bg-[var(--card)]" /></div>
        <p className="sr-only">Preparing your learning workspace…</p>
      </div>
    </main>
  );
}

export default function LearnPage() {
  return <Suspense fallback={<LearnFallback />}><LearnPageClient /></Suspense>;
}
