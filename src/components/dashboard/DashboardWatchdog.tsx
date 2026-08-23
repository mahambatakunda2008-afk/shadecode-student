"use client";

import { useEffect, useState } from "react";
import DashboardReimagined from "./DashboardReimagined";

const WATCHDOG_TIMEOUT_MS = 15_000;

/**
 * Safety net for the dashboard's outer loading gate.
 *
 * The dashboard already handles individual data timeouts and cached fallbacks.
 * This wrapper only intervenes when the actual dashboard shell has not mounted
 * after a generous browser-side window, preventing an infinite skeleton.
 */
export default function DashboardWatchdog() {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    let mounted = true;
    const startedAt = Date.now();

    const check = () => {
      if (!mounted || document.querySelector(".dashboard-shell")) return;
      if (Date.now() - startedAt >= WATCHDOG_TIMEOUT_MS) {
        setStalled(true);
        return;
      }
      window.setTimeout(check, 250);
    };

    const timer = window.setTimeout(check, 250);
    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, []);

  if (stalled) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-6 py-12">
        <section
          className="w-full max-w-lg rounded-2xl border bg-card p-6 text-center shadow-sm"
          role="alert"
          aria-live="polite"
        >
          <h1 className="text-xl font-semibold">Your dashboard is taking too long</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your session may have stalled while loading. Nothing has been lost.
            Try loading the dashboard again.
          </p>
          <button
            type="button"
            className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Reload dashboard
          </button>
        </section>
      </main>
    );
  }

  return <DashboardReimagined />;
}
