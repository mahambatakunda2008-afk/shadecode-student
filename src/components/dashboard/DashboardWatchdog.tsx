"use client";

import { useEffect, useState } from "react";
import { RotateCcw, WifiOff } from "lucide-react";
import DashboardReimagined from "@/components/dashboard/DashboardReimagined";

// The watchdog is a recovery boundary, not the dashboard's data-loading strategy.
// Keep it short enough to prevent a dead network request from trapping the user,
// while giving the device-first dashboard a chance to hydrate normally.
const WATCHDOG_TIMEOUT = 5_000;

/** Prevent a stalled dashboard boot from leaving the initial skeleton indefinitely. */
export default function DashboardWatchdog() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const dashboardMounted = Boolean(document.querySelector(".dashboard-shell"));
      if (!dashboardMounted) setTimedOut(true);
    }, WATCHDOG_TIMEOUT);

    return () => window.clearTimeout(timer);
  }, []);

  if (!timedOut) return <DashboardReimagined />;

  return (
    <main className="dashboard-command-center min-h-full">
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-6 py-16">
        <section className="w-full rounded-2xl border border-border/60 bg-card/80 p-8 text-center shadow-sm backdrop-blur" role="alert">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dashboard boot timeout</p>
          <h1 className="text-2xl font-semibold tracking-tight">The dashboard could not start.</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">A startup request is still blocked. Retrying starts a clean boot without waiting forever on the previous request.</p>
          <button type="button" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90" onClick={() => window.location.reload()}>
            Retry dashboard
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </section>
      </div>
    </main>
  );
}
