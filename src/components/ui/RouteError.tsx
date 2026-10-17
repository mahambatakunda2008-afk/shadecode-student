"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, Home, RotateCcw } from "lucide-react";

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
 * (readable in light and dark), and two clear ways out: retry, or return to the dashboard.
 */
export default function RouteError({ error, reset, boundary, fullPage = false }: RouteErrorProps) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary } });
  }, [error, boundary]);

  return (
    <div
      role="alert"
      className={`flex items-center justify-center p-6 ${fullPage ? "min-h-screen bg-[var(--background)]" : "min-h-[60dvh]"}`}
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center shadow-[var(--shadow-md)]">
        <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
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
