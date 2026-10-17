"use client";

import { useEffect, useState } from "react";
import { RotateCcw, WifiOff } from "lucide-react";
import ExperienceDashboard from "@/components/academic/ExperienceDashboard";

const WATCHDOG_TIMEOUT = 15_000;
const DASHBOARD_READY_SELECTOR = '[data-dashboard-ready="true"], .dashboard-shell[data-experience]';

export default function DashboardWatchdog() {
  const [timedOut, setTimedOut] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    const checkReady = () => {
      if (!document.querySelector(DASHBOARD_READY_SELECTOR)) return;
      setDashboardReady(true);
      setTimedOut(false);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      observer.disconnect();
    };

    const observer = new MutationObserver(checkReady);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-dashboard-ready", "data-experience"],
    });
    timeoutId = window.setTimeout(() => setTimedOut(true), WATCHDOG_TIMEOUT);
    checkReady();

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative min-h-full">
      <ExperienceDashboard />

      {timedOut && !dashboardReady && (
        <div className="fixed inset-0 z-[10000] flex min-h-screen items-center justify-center bg-[var(--background)]/95 px-6 py-16 backdrop-blur-sm">
          <section className="w-full max-w-2xl rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-8 text-center shadow-lg" role="alert" aria-live="assertive">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-2)]">
              <WifiOff className="h-5 w-5 text-[var(--muted-foreground)]" aria-hidden="true" />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Dashboard startup delayed</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Your dashboard is taking longer than expected.</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">
              Your dashboard is still mounted and can recover if its startup request finishes. You can wait a little longer or retry with a fresh page load.
            </p>
            <button type="button" className="ssc-focus-ring mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90" onClick={() => window.location.reload()}>
              Retry dashboard <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
