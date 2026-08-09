// src/app/(app)/layout.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import { UserProvider } from "@/contexts/UserContext";
import { AchievementsProvider } from "@/contexts/AchievementsContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminBottomNav } from "@/components/layout/AdminBottomNav";
import { AchievementToast } from "@/components/AchievementToast";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { getOnboardingStatus } from "@/lib/onboarding";
import { useSession } from "@/hooks/useSession";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [status, setStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading");

  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );
  
  useSession(true);

  useEffect(() => {
    const checkAuthAndOnboarding = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // 🔐 NOT LOGGED IN → LOGIN
        if (!user) {
          setStatus("unauthenticated");
          router.replace("/auth/login");
          return;
        }

        setStatus("authenticated");

        // 🛡️ ADMIN CHECK — admins get an admin-only shell and skip the
        // student onboarding/dashboard flow entirely (has_role is granted
        // to `authenticated`, so the anon-key client can call it directly).
        const { data: adminCheck } = await supabase.rpc("has_role", {
          user_id: user.id,
          role_name: "admin",
        });
        const userIsAdmin = Boolean(adminCheck);
        setIsAdmin(userIsAdmin);

        if (userIsAdmin) {
          if (pathname === "/dashboard" || pathname === "/onboarding") {
            router.replace("/exam-hub");
            return;
          }
          setReady(true);
          return;
        }

        // 🧭 ONBOARDING CHECK (students only)
        const onboarded = getOnboardingStatus();
        console.log({
          route: "(app)",
          profileExists: undefined,
          onboardingCompleted: onboarded,
          tourCompleted: undefined,
          userId: user.id,
        });

        if (!onboarded) {
          router.replace("/onboarding");
          return;
        }

        setReady(true);
      } catch (err) {
        console.error("Auth error:", err);
        setStatus("unauthenticated");
        router.replace("/auth/login");
      }
    };

    checkAuthAndOnboarding();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setStatus("unauthenticated");
        router.replace("/auth/login");
      }

      if (event === "SIGNED_IN") {
        setStatus("authenticated");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase, pathname]);

  // 🔄 LOADING STATE (never infinite because we always resolve or redirect)
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
      </div>
    );
  }

  // 🛡️ ADMIN SHELL — no student chrome (profile, XP, streak, student nav)
  if (isAdmin) {
    return (
      <div className="relative h-screen flex overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <aside className="hidden md:flex md:w-[240px] md:flex-shrink-0">
          <AdminSidebar />
        </aside>
        <main className="flex-1 overflow-y-auto min-w-0 pb-[80px] md:pb-0">
          {children}
        </main>
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999]">
          <AdminBottomNav />
        </div>
      </div>
    );
  }

  return (
    <UserProvider>
      <AchievementsProvider>
      <div className="relative h-screen flex overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        {/* Desktop Sidebar Wrapper */}
        <aside className="hidden md:flex md:w-[240px] md:flex-shrink-0">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-w-0 pb-[80px] md:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Navigation Wrapper */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999]">
          <BottomNav />
        </div>

        {/* Achievement unlock notifications -- fixed-position, renders
            nothing until useAchievements' newUnlocked has an entry */}
        <AchievementToast />

        {/* Floating, one-click feedback entry point -- was previously
            only reachable via Settings, which the person who asked for
            this said people weren't finding. Reuses the existing
            /api/feedback + /api/feedback-email flow; that flow's own
            full-page version (Settings -> Feedback) is left untouched. */}
        <FeedbackWidget />
      </div>
      </AchievementsProvider>
    </UserProvider>
  );
}
