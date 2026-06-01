"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import { UserProvider } from "@/contexts/UserContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [status, setStatus] = useState<
    "loading" | "authenticated" | "unauthenticated"
  >("loading");

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setStatus("unauthenticated");
          router.replace("/auth/login");
          return;
        }

        setStatus("authenticated");
      } catch (err) {
        console.error("Auth check failed:", err);
        setStatus("unauthenticated");
        router.replace("/auth/login");
      }
    };

    checkSession();

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

  // 🔥 NEVER block forever
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a10]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    // optional fallback UI instead of blank flicker
    return null;
  }

  return (
    <UserProvider>
      <div className="relative h-screen flex bg-[#0a0a10] text-white">
        <aside className="hidden md:flex md:w-[260px] md:flex-shrink-0">
          <Sidebar />
        </aside>

        <main className="flex-1 overflow-y-auto pb-[80px] md:pb-0">
          {children}
        </main>

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999]">
          <BottomNav />
        </div>
      </div>
    </UserProvider>
  );
}
