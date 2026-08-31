"use client";

import { useEffect, useState } from "react";
import { RotateCcw, WifiOff } from "lucide-react";
import DashboardReimagined from "@/components/dashboard/DashboardReimagined";

const WATCHDOG_TIMEOUT = 20_000;

/**
 * Keeps the Dashboard from waiting forever on a network/auth gate.
 * The dashboard owns its local read-through cache; this wrapper is only a
 * last-resort escape hatch and never replaces cached content with a timeout
 * screen before the normal dashboard has had a chance to render.
 */
export default function DashboardWatchdog() {
  const [timedOut, setTimedOut] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const timer = window.setTimeout(() => {
      const dashboardMounted = Boolean(document.querySelector(".dashboard-shell"));
      if (!dashboardMounted) setTimedOut(true);
    }, WATCHDOG_TIMEOUT);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <>
      {!timedOut && <DashboardReimagined />}
      {offline && !timedOut && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border/60 bg-card/95 px-4 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur" role="status">
          <span className="inline-flex items-center gap-2"><WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> Offline mode · using saved dashboard data when available</span>
        </div>
      )}
      {timedOut && (
        <main className="dashboard-command-center min-h-full">
          <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-6 py-16">
            <section className="w-full rounded-2xl border border-border/60 bg-card/80 p-8 text-center shadow-sm backdrop-blur" role="alert">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <WifiOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dashboard connection timeout</p>
              <h1 className="text-2xl font-semibold tracking-tight">Your dashboard is taking too long to respond.</h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">A dashboard request did not finish within 20 seconds. Retry to start a fresh request.</p>
              <button type="button" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90" onClick={() => window.location.reload()}>
                Retry dashboard
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </section>
          </div>
        </main>
      )}
    </>
  );
}
