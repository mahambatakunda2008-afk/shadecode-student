"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log crash to Sentry
    Sentry.captureException(error, {
      tags: {
        boundary: "route-error-boundary",
      },
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-6 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-8 text-center transition-all duration-300 hover:border-white/15">
        {/* Animated Icon */}
        <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full text-indigo-400 mb-6 ring-8 ring-indigo-500/5 animate-pulse">
          <AlertCircle className="w-10 h-10" />
        </div>

        {/* Text Details */}
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-2">
          Something went wrong
        </h1>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          An unexpected client-side crash occurred. Sentry has automatically captured the trace, and the team has been notified.
        </p>

        {/* Technical Digest */}
        {error.digest && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 mb-6 text-left font-mono text-[10px] text-slate-500 break-all select-all">
            <span className="text-indigo-400 font-semibold block mb-1">TRACING ID</span>
            {error.digest}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-98 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-600/15 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
          <a
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 text-slate-300 text-sm font-medium rounded-xl transition-all"
          >
            <Home className="w-4 h-4" />
            Go Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
