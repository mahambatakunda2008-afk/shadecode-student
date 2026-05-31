"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { UserProvider } from "@/contexts/UserContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setAuthChecked(true);
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/auth/login");
    });
    return () => subscription.unsubscribe();
  }, [router, supabase]);

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a10]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
          <p className="text-xs text-white/30">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <UserProvider>
      <div className="flex h-screen overflow-hidden bg-[#0a0a10] text-white antialiased">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />
    </UserProvider>
  );
}
