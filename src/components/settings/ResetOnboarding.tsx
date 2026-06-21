"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { clearOnboardingComplete } from "@/lib/onboarding";

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

      clearOnboardingComplete();
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--warning-soft)] text-[var(--warning)]">
          <RotateCcw size={20} />
        </div>
        <div>
          <h3 className="text-base font-semibold">Re-run setup</h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Update your education level, learning goal, and subject preferences.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_24%,transparent)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}

      <button
        onClick={handleReset}
        disabled={isLoading}
        className="ssc-button ssc-button-secondary self-start"
      >
        <RotateCcw size={16} />
        {isLoading ? "Resetting" : "Redo setup"}
      </button>
    </div>
  );
}
