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
import { useSession } from "@/hooks/useSession";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) {
            setStatus("unauthenticated");
            router.replace("/auth/login");
          }
          return;
        }

        if (cancelled) return;
        setStatus("authenticated");

        const { data: adminCheck, error: adminError } = await supabase.rpc("has_role", {
          user_id: user.id,
          role_name: "admin",
        });
        if (adminError) throw adminError;

        const userIsAdmin = Boolean(adminCheck);
        setIsAdmin(userIsAdmin);

        if (userIsAdmin) {
          if (pathname === "/dashboard" || pathname === "/onboarding") {
            router.replace("/admin");
            return;
          }
          setReady(true);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile?.onboarding_completed !== true) {
          router.replace("/onboarding");
          return;
        }

        setReady(true);
      } catch (err) {
        console.error("Auth/onboarding error:", err);
        if (!cancelled) {
          setStatus("unauthenticated");
          router.replace("/auth/login?error=profile_check");
        }
      }
    };

    checkAuthAndOnboarding();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setStatus("unauthenticated");
        setReady(false);
        router.replace("/auth/login");
      } else if (event === "SIGNED_IN") {
        setStatus("authenticated");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router, supabase, pathname]);

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
