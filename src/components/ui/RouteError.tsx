"use client";

import { useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, Home, RefreshCw, RotateCcw, WifiOff } from "lucide-react";
import { classifyRouteError } from "@/lib/offline/classifyError";
import { listSavedRoutes, type SavedRoute } from "@/lib/offline/savedRoutes";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Sentry tag so crashes can be traced to the boundary that caught them. */
  boundary: string;
  /** Full-page when the whole app shell is gone; in-shell keeps sidebar and nav visible. */
  fullPage?: boolean;
}

/**
 * Shared recovery screen for route crashes. Calm, student-facing wording, token-based colours
 * (readable in light and dark), and clear ways out.
 *
 * Losing signal is not a crash: when the failure is a missing network or a missing code file while
 * offline, this says so, lists the screens saved on the device, and retries by itself on reconnect.
 * An app update while a tab was open is also handled without blaming the student. Only real bugs
 * are reported to Sentry.
 */
export default function RouteError({ error, reset, boundary, fullPage = false }: RouteErrorProps) {
  // Decided once, at first render, so reconnecting does not reclassify an offline failure as a bug.
  const kind = useRef(classifyRouteError(error, typeof navigator === "undefined" ? true : navigator.onLine)).current;
  const [saved, setSaved] = useState<SavedRoute[]>([]);

  useEffect(() => {
    if (kind === "other") Sentry.captureException(error, { tags: { boundary } });
  }, [error, boundary, kind]);

  useEffect(() => {
    if (kind !== "offline") return;
    let cancelled = false;
    void listSavedRoutes().then((routes) => { if (!cancelled) setSaved(routes); });
    const retry = () => reset();
    window.addEventListener("online", retry);
    return () => {
      cancelled = true;
      window.removeEventListener("online", retry);
    };
  }, [kind, reset]);

  const frame = `flex items-center justify-center p-6 ${fullPage ? "min-h-screen bg-[var(--background)]" : "min-h-[60dvh]"}`;
  const card = "w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center shadow-[var(--shadow-md)]";
  const iconWrap = "mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full";

  if (kind === "offline") {
    return (
      <div role="status" className={frame}>
        <div className={card}>
          <div className={`${iconWrap} bg-[var(--surface-2)] text-[var(--text-secondary)]`}>
            <WifiOff className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="mb-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">You&apos;re offline</h1>
          <p className="mb-6 text-sm leading-relaxed text-[var(--text-secondary)]">
            This screen isn&apos;t saved on your device yet, so it can&apos;t open without internet. Your work is safe, and this page will reload by itself when you reconnect.
          </p>
          {saved.length > 0 && (
            <div className="mb-6 text-left">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Open a saved screen</p>
              <ul className="grid grid-cols-2 gap-2">
                {saved.map((route) => (
                  <li key={route.href}>
                    <a href={route.href} className="ssc-button ssc-button-secondary w-full justify-center">{route.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" onClick={() => reset()} className="ssc-button">
            <RotateCcw className="h-4 w-4" aria-hidden /> Try again
          </button>
        </div>
      </div>
    );
  }

  if (kind === "stale-build") {
    return (
      <div role="status" className={frame}>
        <div className={card}>
          <div className={`${iconWrap} bg-[var(--surface-2)] text-[var(--text-secondary)]`}>
            <RefreshCw className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="mb-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">Shadecode was updated</h1>
          <p className="mb-6 text-sm leading-relaxed text-[var(--text-secondary)]">Reload to get the latest version. Your work and progress are safe.</p>
          <button type="button" onClick={() => window.location.reload()} className="ssc-button">
            <RefreshCw className="h-4 w-4" aria-hidden /> Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div role="alert" className={frame}>
      <div className={card}>
        <div className={`${iconWrap} bg-[var(--danger-soft)] text-[var(--danger)]`}>
          <AlertCircle className="h-7 w-7" aria-hidden />
        </div>
        <h1 className="mb-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">This page hit a problem</h1>
        <p className="mb-6 text-sm leading-relaxed text-[var(--text-secondary)]">
          Your work and progress are safe. Try again, or head back to your dashboard. If it keeps happening, tell us the reference below.
        </p>
        {error.digest && (
          <p className="mb-6 break-all rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--text-tertiary)] select-all">
            Reference: {error.digest}
          </p>
        )}
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => reset()} className="ssc-button">
            <RotateCcw className="h-4 w-4" aria-hidden /> Try again
          </button>
          <a href="/dashboard" className="ssc-button ssc-button-secondary">
            <Home className="h-4 w-4" aria-hidden /> Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
