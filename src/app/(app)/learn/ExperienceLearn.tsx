"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import LearnPrefillGuard from "./LearnPrefillGuard";

const AUTH_TIMEOUT_MS = 8_000;

type GateState = "checking" | "ready" | "error";

export default function ExperienceLearn() {
  const router = useRouter();
  const [state, setState] = useState<GateState>("checking");
  const [attempt, setAttempt] = useState(0);

  const verifySession = useCallback(async (signal: { cancelled: boolean }) => {
    setState("checking");
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const supabase = createClient();
      const result = await Promise.race([
        supabase.auth.getUser(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("AUTH_CHECK_TIMEOUT")), AUTH_TIMEOUT_MS);
        }),
      ]);

      if (signal.cancelled) return;
      if (result.error) {
        // A transient auth/network error is not proof that the user is signed out.
        console.error("[Learn] session verification failed:", result.error);
        setState("error");
        return;
      }
      if (!result.data.user) {
        router.replace("/auth/login");
        return;
      }
      setState("ready");
    } catch (error) {
      if (signal.cancelled) return;
      console.error("[Learn] session verification unavailable:", error);
      setState("error");
    } finally {
      if (timer) clearTimeout(timer);
    }
  }, [router]);

  useEffect(() => {
    const signal = { cancelled: false };
    void verifySession(signal);
    return () => { signal.cancelled = true; };
  }, [verifySession, attempt]);

  if (state === "error") {
    return (
      <main className="min-h-[70vh] bg-[var(--background)] px-5 py-10 text-[var(--foreground)]">
        <section className="mx-auto max-w-xl rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8" role="alert">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <WifiOff size={22} aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Your learning space could not connect</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            We could not verify your session right now. Your account has not been signed out. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => setAttempt(value => value + 1)}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition hover:bg-[var(--primary-hover)]"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (state !== "ready") {
    return (
      <main className="min-h-[70vh] bg-[var(--background)] px-5 py-10 text-[var(--foreground)]" aria-busy="true" aria-label="Checking your session">
        <div className="mx-auto max-w-7xl space-y-5">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Checking your learning space…
          </div>
          <div className="animate-pulse space-y-5">
            <div className="h-5 w-36 rounded-full bg-black/10 dark:bg-white/10" />
            <div className="h-12 w-3/5 rounded-2xl bg-black/10 dark:bg-white/10" />
            <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]"><div className="h-80 rounded-[28px] bg-black/10 dark:bg-white/10" /><div className="h-80 rounded-[28px] bg-black/10 dark:bg-white/10" /></div>
          </div>
        </div>
      </main>
    );
  }

  return <LearnPrefillGuard />;
}
