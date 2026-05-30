"use client";
// src/app/(app)/layout.tsx
//
// Layout for all AUTHENTICATED routes: /dashboard, /exam-sim, /focus, etc.
// Wraps children in UserProvider + Sidebar.
// Redirects unauthenticated visitors to /auth/login.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { UserProvider } from "@/contexts/UserContext";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      // getUser() validates against the Supabase server — harder to spoof than getSession()
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setAuthChecked(true);
    };

    checkSession();

    // Also listen for sign-out events mid-session
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.replace("/auth/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  // Render nothing while we verify auth — prevents flash of authenticated UI
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
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Page content */}
        <main
          className="
            flex-1
            overflow-y-auto
            pb-20          /* mobile bottom nav clearance */
            sm:pb-0
          "
        >
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
