"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  LayoutDashboard,
  Timer,
  CheckSquare,
  FlaskConical,
  Brain,
  Calculator,
  BarChart3,
  Trophy,
  Settings,
  LogOut,
  BrainCircuit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";

// ─── NAV ───────────────────────────────────────────────────────────────

const NAV = [
  {
    group: "Core",
    items: [
      { href: "/dashboard", label: "Home", icon: LayoutDashboard },
      { href: "/focus", label: "Focus", icon: Timer },
    ],
  },
  {
    group: "Practice",
    items: [
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/exams", label: "Exams", icon: FlaskConical },
    ],
  },
  {
    group: "Tools",
    items: [
      { href: "/learn", label: "AI Learn", icon: Brain },
      { href: "/math-checker", label: "Math", icon: Calculator },
    ],
  },
  {
    group: "Progress",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/insights/history", label: "Cortex", icon: BrainCircuit },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUser();

  const firstName =
    profile?.first_name ??
    profile?.full_name?.split(" ")[0] ??
    "Student";

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  return (
    <aside className="hidden md:flex h-screen w-[220px] flex-col bg-[#0e0e18] border-r border-white/[0.08] px-[10px] py-4">

      {/* Logo */}
      <div className="px-[10px] pb-4 mb-4 border-b border-white/[0.07]">
        <p className="text-[14px] font-semibold text-white">Shadecode</p>
        <p className="text-[10px] text-white/30">Student</p>
      </div>

      {/* NAV */}
      <nav className="flex-1 flex flex-col gap-4">
        {NAV.map((section) => (
          <div key={section.group}>
            <p className="text-[10px] text-white/25 uppercase px-[10px] mb-2">
              {section.group}
            </p>

            <div className="flex flex-col gap-[2px]">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href ||
                  (href !== "/" && pathname.startsWith(href));

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 px-[10px] py-[8px] rounded-lg text-[13px]",
                      active
                        ? "bg-indigo-500/15 text-indigo-300"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/[0.07] pt-3 flex flex-col gap-2">

        <Link
          href="/settings"
          className="text-[13px] text-white/50 hover:text-white px-[10px]"
        >
          Settings
        </Link>

        <button
          onClick={handleSignOut}
          className="text-[13px] text-red-400/60 hover:text-red-400 px-[10px] text-left"
        >
          Sign out
        </button>

        <div className="px-[10px] pt-2 text-[11px] text-white/30">
          {firstName}
        </div>
      </div>
    </aside>
  );
}
