"use client";

import { useEffect, useState } from "react";
import { RotateCcw, WifiOff } from "lucide-react";
import ExperienceDashboard from "@/components/academic/ExperienceDashboard";

const WATCHDOG_TIMEOUT = 5_000;

export default function DashboardWatchdog() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const dashboardMounted = Boolean(document.querySelector(".dashboard-shell"));
      if (!dashboardMounted) setTimedOut(true);
    }, WATCHDOG_TIMEOUT);
    return () => window.clearTimeout(timer);
  }, []);

  if (!timedOut) return <ExperienceDashboard />;

  return (
    <main className="dashboard-command-center min-h-full">
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-6 py-16">
        <section className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-8 text-center shadow-sm" role="alert">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)]"><WifiOff className="h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" /></div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Dashboard boot timeout</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">The dashboard could not start.</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">A startup request is still blocked. Retrying starts a clean boot without waiting forever on the previous request.</p>
          <button type="button" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90" onClick={() => window.location.reload()}>Retry dashboard<RotateCcw className="h-4 w-4" /></button>
        </section>
      </div>
    </main>
  );
}
