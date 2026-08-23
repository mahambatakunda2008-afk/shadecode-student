// src/app/(app)/layout.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import { UserProvider } from "@/contexts/UserContext";
import { AchievementsProvider } from "@/contexts/AchievementsContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminBottomNav } from "@/components/layout/AdminBottomNav";
import { AchievementToast } from "@/components/AchievementToast";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import LessonEvidenceRecorder from "@/components/studyspace/LessonEvidenceRecorder";

const ADMIN_CACHE_PREFIX = "shadecode:admin:";
const BOOT_AUTH_TIMEOUT_MS = 1_500;
const ROLE_REFRESH_TIMEOUT_MS = 4_000;

function readBooleanCache(prefix: string, userId: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(`${prefix}${userId}`);
    return value === null ? null : value === "true";
  } catch {
    return null;
  }
}

function writeBooleanCache(prefix: string, userId: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${prefix}${userId}`, String(value));
  } catch {
    // Optional UI cache. Middleware remains authoritative for access control.
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Authenticated application shell.
 *
 * Middleware is the security/access-control boundary. This client layout must
 * never hold every application route behind Supabase profile/RPC requests.
 * The shell renders first, then admin state is refreshed in the background.
 * This prevents a slow/offline Supabase request from turning the whole app
 * into an infinite spinner.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          BOOT_AUTH_TIMEOUT_MS
        );
        if (cancelled) return;

        const user = session?.user;
        if (!user) {
          router.replace("/auth/login");
          return;
        }

        const cachedAdmin = readBooleanCache(ADMIN_CACHE_PREFIX, user.id);
        if (cachedAdmin !== null) setIsAdmin(cachedAdmin);

        // Access is already protected by middleware. Role refresh is strictly
        // background and can never block the page from rendering.
        if (typeof navigator !== "undefined" && !navigator.onLine) return;

        try {
          const adminResult = await withTimeout(
            supabase.rpc("has_role", { user_id: user.id, role_name: "admin" }),
            ROLE_REFRESH_TIMEOUT_MS
          );
          if (cancelled || adminResult.error) return;

          const nextIsAdmin = Boolean(adminResult.data);
          setIsAdmin(nextIsAdmin);
          writeBooleanCache(ADMIN_CACHE_PREFIX, user.id, nextIsAdmin);

          const path = window.location.pathname;
          if (nextIsAdmin && (path === "/dashboard" || path === "/onboarding")) {
            router.replace("/admin");
          }
        } catch (error) {
          console.warn("[AppLayout] Background role refresh unavailable:", error);
        }
      } catch (error) {
        // A protected request that reaches this layout has already passed the
        // server middleware. Do not replace the application with a spinner if
        // the browser-side Supabase client is slow or temporarily unavailable.
        console.warn("[AppLayout] Non-blocking auth bootstrap unavailable:", error);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setIsAdmin(false);
        router.replace("/auth/login");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (isAdmin) {
    return (
      <div className="relative h-screen flex overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <aside className="hidden md:flex md:w-[240px] md:flex-shrink-0"><AdminSidebar /></aside>
        <main className="flex-1 overflow-y-auto min-w-0 pb-[80px] md:pb-0">
          <LessonEvidenceRecorder />
          {children}
        </main>
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999]"><AdminBottomNav /></div>
      </div>
    );
  }

  return (
    <UserProvider>
      <AchievementsProvider>
        <div className="relative h-screen flex overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
          <aside className="hidden md:flex md:w-[240px] md:flex-shrink-0"><Sidebar /></aside>
          <main className="flex-1 overflow-y-auto min-w-0 pb-[80px] md:pb-0">
            <LessonEvidenceRecorder />
            {children}
          </main>
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999]"><BottomNav /></div>
          <AchievementToast />
          <FeedbackWidget />
        </div>
      </AchievementsProvider>
    </UserProvider>
  );
}
