import { Suspense } from "react";
import LearnPageIntelligent from "./LearnPageIntelligent";

function LearnFallback() {
  return (
    <main className="min-h-screen bg-[var(--background)] p-4 sm:p-6 lg:p-8" aria-busy="true" aria-label="Loading Learn">
      <div className="mx-auto w-full max-w-6xl space-y-5 animate-pulse">
        <div className="h-10 w-52 rounded-xl bg-[var(--muted)]" />
        <div className="h-5 w-80 max-w-full rounded bg-[var(--muted)]" />
        <div className="h-44 rounded-3xl border border-[var(--card-border)] bg-[var(--card)]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="h-32 rounded-2xl border border-[var(--card-border)] bg-[var(--card)]" />)}</div>
      </div>
    </main>
  );
}

export default function LearnPage() {
  return (
    <Suspense fallback={<LearnFallback />}>
      <LearnPageIntelligent />
    </Suspense>
  );
}
