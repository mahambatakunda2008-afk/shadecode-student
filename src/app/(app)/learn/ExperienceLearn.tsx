"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LearnPrefillGuard from "./LearnPrefillGuard";

export default function ExperienceLearn() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const verifySession = async () => {
      try {
        const { data, error } = await createClient().auth.getUser();
        if (error || !data.user) {
          router.replace("/auth/login");
          return;
        }
        if (!cancelled) setReady(true);
      } catch {
        router.replace("/auth/login");
      }
    };
    void verifySession();
    return () => { cancelled = true; };
  }, [router]);

  if (!ready) {
    return (
      <main className="min-h-[70vh] bg-[#f7f7f4] px-5 py-10 dark:bg-[#101311]" aria-busy="true">
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="h-5 w-36 rounded-full bg-black/10 dark:bg-white/10" />
          <div className="h-12 w-3/5 rounded-2xl bg-black/10 dark:bg-white/10" />
          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]"><div className="h-80 rounded-[28px] bg-black/10 dark:bg-white/10" /><div className="h-80 rounded-[28px] bg-black/10 dark:bg-white/10" /></div>
        </div>
      </main>
    );
  }

  return <LearnPrefillGuard />;
}
