"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import { UserProvider } from "@/contexts/UserContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { getOnboardingStatus } from "@/lib/onboarding";
import { useSession } from "@/hooks/useSession";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [status, setStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading");

  const [ready, setReady] = useState(false);

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

        // 🧭 ONBOARDING CHECK
        const onboarded = getOnboardingStatus();

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
  }, [router, supabase]);

  // 🔄 LOADING STATE (never infinite because we always resolve or redirect)
  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a10]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <UserProvider>
      <div className="relative h-screen flex bg-[#0a0a10] text-white overflow-hidden">
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
      </div>
    </UserProvider>
  );
}
