"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ShieldAlert, RotateCcw } from "lucide-react";
import "./globals.css";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log fatal layout crash to Sentry
    Sentry.captureException(error, {
      tags: {
        boundary: "global-error-boundary",
      },
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6 relative overflow-hidden font-sans">
        {/* Background ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-8 text-center">
          {/* Animated Icon */}
          <div className="inline-flex items-center justify-center p-4 bg-rose-500/10 rounded-full text-rose-400 mb-6 ring-8 ring-rose-500/5 animate-pulse">
            <ShieldAlert className="w-10 h-10" />
          </div>

          {/* Text Details */}
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-2">
            System Failure
          </h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            A fatal error has occurred in the application root. Sentry has captured this trace, and our operations team is diagnosing the failure.
          </p>

          {/* Technical Digest */}
          {error.digest && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 mb-6 text-left font-mono text-[10px] text-slate-500 break-all select-all">
              <span className="text-rose-400 font-semibold block mb-1">FATAL TRACE ID</span>
              {error.digest}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 active:scale-98 text-white text-sm font-medium rounded-xl shadow-lg shadow-rose-600/15 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
