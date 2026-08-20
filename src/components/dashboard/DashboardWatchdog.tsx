"use client";

import { useEffect, useState } from "react";
import { RotateCcw, WifiOff } from "lucide-react";
import DashboardReimagined from "@/components/dashboard/DashboardReimagined";

const WATCHDOG_TIMEOUT = 20_000;

/**
 * Dashboard-level safety net.
 *
 * DashboardReimagined has bounded core/Cortex requests, but the initial
 * dashboard gate also waits on auth and the upcoming-exams query. A browser
 * request that never settles can therefore leave the outer skeleton mounted
 * forever. This watchdog guarantees that the user gets an actionable state.
 */
export default function DashboardWatchdog() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), WATCHDOG_TIMEOUT);
    return () => window.clearTimeout(timer);
  }, []);

  if (!timedOut) return <DashboardReimagined />;

  return (
    <main className="dashboard-command-center min-h-full">
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-6 py-16">
        <section
          className="w-full rounded-2xl border border-border/60 bg-card/80 p-8 text-center shadow-sm backdrop-blur"
          role="alert"
        >
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Dashboard connection timeout
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Your dashboard is taking too long to respond.</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            A dashboard request did not finish within 20 seconds. Nothing is wrong with your account data. Retry to start a fresh request.
          </p>
          <button
            type="button"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            onClick={() => window.location.reload()}
          >
            Retry dashboard
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>
      </div>
    </main>
  );
}
