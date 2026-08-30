import { Suspense } from "react";
import ExamSimulationClient from "./ExamSimulationClient";

export const dynamic = "force-dynamic";

function Fallback() {
  return (
    <main className="min-h-[60vh] bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8" aria-busy="true" aria-live="polite">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-[var(--muted)]" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-[var(--muted)]" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl border border-[var(--card-border)] bg-[var(--card)]" />
          <div className="h-28 animate-pulse rounded-2xl border border-[var(--card-border)] bg-[var(--card)]" />
          <div className="h-28 animate-pulse rounded-2xl border border-[var(--card-border)] bg-[var(--card)]" />
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">Preparing your exam workspace…</p>
      </div>
    </main>
  );
}

export default function ExamSimulationPage() {
  return <Suspense fallback={<Fallback />}><ExamSimulationClient /></Suspense>;
}
