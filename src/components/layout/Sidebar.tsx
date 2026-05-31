"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  LayoutDashboard, Brain, CheckSquare, Calendar, Timer,
  FlaskConical, Gamepad2, Calculator, BarChart3, Trophy,
  Settings, LogOut, Flame, Search, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "default" | "urgent";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Study",
    items: [
      { href: "/dashboard",  label: "Dashboard",    icon: LayoutDashboard },
      { href: "/learn",      label: "AI Learn",     icon: Brain },
      { href: "/tasks",      label: "Tasks",        icon: CheckSquare },
      { href: "/timetable",  label: "Timetable",    icon: Calendar },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/focus",         label: "Focus",        icon: Timer },
      { href: "/exams",         label: "Exams",        icon: FlaskConical },
      { href: "/exam-sim",      label: "Exam Sim",     icon: Gamepad2 },
      { href: "/math-checker",  label: "Math Checker", icon: Calculator },
    ],
  },
  {
    label: "Progress",
    items: [
      { href: "/analytics",   label: "Analytics",   icon: BarChart3 },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
];

// ─── Streak messages ──────────────────────────────────────────────────────────

function streakMessage(days: number): string {
  if (days >= 30) return "Unstoppable.";
  if (days >= 14) return "Your momentum is dangerous.";
  if (days >= 7)  return "One week strong.";
  if (days >= 3)  return "Keep it going.";
  return "Building the habit.";
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { profile } = useUser();

  // Derive display values from profile — never show fallback data
  const firstName   = profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "Student";
  const initial     = firstName.charAt(0).toUpperCase();
  const streak      = profile?.streak  ?? 0;
  const level       = profile?.level   ?? 1;
  const xp          = profile?.xp      ?? 0;

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
    <aside className="hidden md:flex h-screen w-[220px] flex-shrink-0 flex-col
      bg-[#0e0e18] border-r border-white/[0.06] px-2.5 py-4 overflow-y-auto">

      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 px-2.5 pb-4 mb-2
        border-b border-white/[0.07]">
        <div className="w-7 h-7 rounded-[7px] bg-indigo-500 flex items-center
          justify-center text-sm font-medium text-white flex-shrink-0">
          ◈
        </div>
        <div>
          <p className="text-sm font-medium text-white/90 leading-tight">Shadecode</p>
          <p className="text-[10px] text-white/30">Student</p>
        </div>
      </div>

      {/* ── Streak pill (only when streak > 0) ── */}
      {streak > 0 && (
        <div className="mx-0.5 mb-3 mt-2 rounded-lg
          bg-orange-500/10 border border-orange-500/20 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-orange-400/90">
              {streak} day streak
            </span>
          </div>
          <p className="text-[10px] text-orange-400/40 mt-0.5 pl-5">
            {streakMessage(streak)}
          </p>
        </div>
      )}

      {/* ── Search ── */}
      <button className="flex items-center gap-2 w-full px-2.5 py-[7px] mb-3
        bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07]
        rounded-lg transition-colors text-left">
        <Search className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
        <span className="text-xs text-white/30 flex-1">Search anything…</span>
        <kbd className="text-[10px] text-white/20 bg-white/[0.06]
          px-1.5 py-0.5 rounded font-mono leading-none">⌘K</kbd>
      </button>

      {/* ── Nav groups ── */}
      <nav className="flex-1 flex flex-col gap-0.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            <p className="text-[10px] font-medium text-white/[0.22] uppercase
              tracking-[0.08em] px-2.5 py-1.5 mt-1">
              {group.label}
            </p>

            {group.items.map(({ href, label, icon: Icon, badge, badgeVariant }) => {
              const isActive =
                pathname === href ||
                (href !== "/" && pathname.startsWith(href));

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-[8px] rounded-lg",
                    "transition-colors duration-150 group",
                    isActive
                      ? "bg-indigo-500/[0.15] border border-indigo-500/[0.28]"
                      : "hover:bg-white/[0.05] border border-transparent"
                  )}
                >
                  <Icon className={cn(
                    "w-[15px] h-[15px] flex-shrink-0 transition-colors",
                    isActive
                      ? "text-indigo-400"
                      : "text-white/35 group-hover:text-white/55"
                  )} />
                  <span className={cn(
                    "text-[13px] flex-1 transition-colors",
                    isActive
                      ? "text-indigo-400 font-medium"
                      : "text-white/55 group-hover:text-white/80"
                  )}>
                    {label}
                  </span>
                  {badge && (
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                      badgeVariant === "urgent"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-indigo-500/20 text-indigo-400"
                    )}>
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Bottom ── */}
      <div className="border-t border-white/[0.07] pt-2 mt-2 flex flex-col gap-0.5">

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-[8px] rounded-lg transition-colors",
            pathname === "/settings"
              ? "bg-indigo-500/[0.15] border border-indigo-500/[0.28]"
              : "hover:bg-white/[0.05] border border-transparent"
          )}
        >
          <Settings className={cn(
            "w-[15px] h-[15px] flex-shrink-0",
            pathname === "/settings" ? "text-indigo-400" : "text-white/35"
          )} />
          <span className={cn(
            "text-[13px]",
            pathname === "/settings" ? "text-indigo-400 font-medium" : "text-white/40"
          )}>
            Settings
          </span>
        </Link>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-2.5 py-[8px] rounded-lg
            border border-transparent hover:bg-red-500/[0.07]
            hover:border-red-500/[0.12] transition-colors group w-full text-left"
        >
          <LogOut className="w-[15px] h-[15px] text-white/25
            group-hover:text-red-400 transition-colors flex-shrink-0" />
          <span className="text-[13px] text-white/30
            group-hover:text-red-400 transition-colors">
            Sign out
          </span>
        </button>

        {/* Profile row */}
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg
            hover:bg-white/[0.05] transition-colors
            mt-1 pt-3 border-t border-white/[0.06]"
        >
          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center
            justify-center text-xs font-semibold text-white flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/75 truncate">{firstName}</p>
            <p className="text-[10px] text-white/30">Level {level} · {xp} XP</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
