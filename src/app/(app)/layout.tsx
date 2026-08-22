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
import { useSession } from "@/hooks/useSession";

const AUTH_GATE_TIMEOUT_MS = 4_000;
const ADMIN_CACHE_PREFIX = "shadecode:admin:";
const ONBOARDING_CACHE_PREFIX = "shadecode:onboarding:";

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`App auth check timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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
    // UI cache is optional. Server-side middleware remains authoritative.
  }
}

function clearUserGateCache(userId?: string): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${ADMIN_CACHE_PREFIX}${userId}`);
    window.localStorage.removeItem(`${ONBOARDING_CACHE_PREFIX}${userId}`);
  } catch {
    // Best-effort cleanup only.
  }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  useSession(true);

  useEffect(() => {
    let cancelled = false;

    const checkAuthAndOnboarding = async () => {
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";

      try {
        // getSession() reads the browser session without forcing a network
        // round-trip. This is essential for offline app navigation.
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), AUTH_GATE_TIMEOUT_MS);
        const user = session?.user ?? null;

        if (!user) {
          if (!cancelled) {
            setStatus("unauthenticated");
            setReady(false);
            router.replace("/auth/login");
          }
          return;
        }

        if (cancelled) return;
        setStatus("authenticated");

        const cachedAdmin = readBooleanCache(ADMIN_CACHE_PREFIX, user.id);
        const cachedOnboarding = readBooleanCache(ONBOARDING_CACHE_PREFIX, user.id);

        // Offline mode must not block the entire application behind Supabase.
        // The server middleware remains the security authority; these values
        // only choose which local shell to render while disconnected.
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setIsAdmin(cachedAdmin === true);
          setReady(true);
          return;
        }

        try {
          // These checks are independent once the authenticated user exists.
          // Run them together and bound the whole operation so a slow Supabase
          // connection cannot recreate the historical infinite spinner.
          const [adminResult, profileResult] = await withTimeout(
            Promise.all([
              supabase.rpc("has_role", { user_id: user.id, role_name: "admin" }),
              supabase
                .from("user_profiles")
                .select("onboarding_completed")
                .eq("user_id", user.id)
                .maybeSingle(),
            ]),
            AUTH_GATE_TIMEOUT_MS
          );

          if (adminResult.error) throw adminResult.error;
          if (profileResult.error) throw profileResult.error;

          const userIsAdmin = Boolean(adminResult.data);
          const onboardingComplete = profileResult.data?.onboarding_completed === true;
          setIsAdmin(userIsAdmin);
          writeBooleanCache(ADMIN_CACHE_PREFIX, user.id, userIsAdmin);
          writeBooleanCache(ONBOARDING_CACHE_PREFIX, user.id, onboardingComplete);

          if (userIsAdmin) {
            if (currentPath === "/dashboard" || currentPath === "/onboarding") {
              router.replace("/admin");
              return;
            }
            setReady(true);
            return;
          }

          if (!onboardingComplete) {
            router.replace("/onboarding");
            return;
          }

          setReady(true);
        } catch (checkError) {
          // A verified browser session is enough to keep the app usable when
          // the secondary role/profile checks are temporarily unavailable.
          // Middleware performs the authoritative server-side access control.
          console.warn("[AppLayout] Secondary auth checks unavailable; using cached shell:", checkError);
          setIsAdmin(cachedAdmin === true);

          if (cachedAdmin === true && (currentPath === "/dashboard" || currentPath === "/onboarding")) {
            router.replace("/admin");
            return;
          }

          if (cachedAdmin !== true && cachedOnboarding === false && currentPath !== "/onboarding") {
            router.replace("/onboarding");
            return;
          }

          setReady(true);
        }
      } catch (err) {
        console.error("[AppLayout] Session check failed:", err);
        if (!cancelled) {
          setStatus("unauthenticated");
          setReady(false);
          router.replace("/auth/login?error=session_check");
        }
      }
    };

    void checkAuthAndOnboarding();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setStatus("unauthenticated");
        setReady(false);
        setIsAdmin(false);
        router.replace("/auth/login");
      } else if (event === "SIGNED_IN" && session) {
        setStatus("authenticated");
        setReady(false);
        void checkAuthAndOnboarding();
      } else if (event === "TOKEN_REFRESHED" && session) {
        setStatus("authenticated");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="relative h-screen flex overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <aside className="hidden md:flex md:w-[240px] md:flex-shrink-0"><AdminSidebar /></aside>
        <main className="flex-1 overflow-y-auto min-w-0 pb-[80px] md:pb-0">{children}</main>
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999]"><AdminBottomNav /></div>
      </div>
    );
  }

  return (
    <UserProvider>
      <AchievementsProvider>
        <div className="relative h-screen flex overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
          <aside className="hidden md:flex md:w-[240px] md:flex-shrink-0"><Sidebar /></aside>
          <main className="flex-1 overflow-y-auto min-w-0 pb-[80px] md:pb-0">{children}</main>
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999]"><BottomNav /></div>
          <AchievementToast />
          <FeedbackWidget />
        </div>
      </AchievementsProvider>
    </UserProvider>
  );
}
