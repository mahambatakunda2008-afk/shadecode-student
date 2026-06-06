"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Drop this component into your Settings page.
 * It resets the user's onboarding_completed flag and redirects to /onboarding.
 */
export function ResetOnboarding() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/reset", { method: "POST" });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Reset failed");
      }

      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-zinc-200">
          Re-run Setup
        </h3>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Update your education level, learning goal, and subject preferences.
          Your progress and streaks are not affected.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={handleReset}
        disabled={isLoading}
        className="self-start py-2 px-4 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
      >
        {isLoading ? "Resetting…" : "Redo setup →"}
      </button>
    </div>
  );
}
