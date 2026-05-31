"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useUser } from "@/contexts/UserContext";
import {
  LayoutDashboard, Brain, CheckSquare, Calendar, Timer,
  FlaskConical, Gamepad2, Calculator, BarChart3, Trophy,
  Settings, LogOut, Flame, Search, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Add this interface above NAV_GROUPS
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
      { href: "/tasks",      label: "Tasks",        icon: CheckSquare, badge: "3" },
      { href: "/timetable",  label: "Timetable",    icon: Calendar },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/focus",        label: "Focus",        icon: Timer },
      { href: "/exams",        label: "Exams",        icon: FlaskConical, badge: "2d", badgeVariant: "urgent" },
      { href: "/exam-sim",     label: "Exam Sim",     icon: Gamepad2 },
      { href: "/math-checker", label: "Math Checker", icon: Calculator },
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

export function Sidebar() {
  const { profile } = useUser();

  const userName    = profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "Student";
  const userInitial = userName.charAt(0).toUpperCase();
  const streakDays  = profile?.streak  ?? 0;
  const level       = profile?.level   ?? 1;
  const xp          = profile?.xp      ?? 0;
  const pathname = usePathname();
  const router = useRouter();

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
    <aside className="hidden md:flex h-screen w-[220px] flex-shrink-0 flex-col bg-[#0e0e18] border-r border-white/[0.06] px-2.5 py-4 overflow-y-auto">

      {/* Logo */}
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

      {/* Streak */}
      {streakDays > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 mt-2
          bg-orange-500/10 border border-orange-500/20 rounded-lg mb-2.5">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-xs font-medium text-orange-400/90">
            {streakDays} day streak
          </span>
        </div>
      )}

      {/* Search */}
      <button className="flex items-center gap-2 w-full px-2.5 py-1.5 mb-3
        bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07]
        rounded-lg transition-colors text-left">
        <Search className="w-3.5 h-3.5 text-white/25" />
        <span className="text-xs text-white/30 flex-1">Search anything…</span>
        <kbd className="text-[10px] text-white/20 bg-white/[0.06]
          px-1 rounded font-mono">⌘K</kbd>
      </button>

      {/* Nav groups */}
      <nav className="flex-1 flex flex-col gap-0.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-1">
            <p className="text-[10px] font-medium text-white/20 uppercase
              tracking-widest px-2.5 py-1.5 mt-1">
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon, badge, badgeVariant }) => {
              const isActive = pathname === href ||
                (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg",
                    "transition-colors duration-150 group",
                    isActive
                      ? "bg-indigo-500/15 border border-indigo-500/30"
                      : "hover:bg-white/[0.05] border border-transparent"
                  )}
                >
                  <Icon className={cn(
                    "w-4 h-4 flex-shrink-0",
                    isActive ? "text-indigo-400" : "text-white/35 group-hover:text-white/55"
                  )} />
                  <span className={cn(
                    "text-[13px] flex-1",
                    isActive
                      ? "text-indigo-400 font-medium"
                      : "text-white/55 group-hover:text-white/75"
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

      {/* Bottom actions */}
      <div className="border-t border-white/[0.07] pt-2 mt-2 flex flex-col gap-0.5">
        <Link href="/settings"
          className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors",
            pathname === "/settings"
              ? "bg-indigo-500/15 border border-indigo-500/30"
              : "hover:bg-white/[0.05] border border-transparent"
          )}>
          <Settings className={cn(
            "w-4 h-4",
            pathname === "/settings" ? "text-indigo-400" : "text-white/35"
          )} />
          <span className={cn(
            "text-[13px]",
            pathname === "/settings" ? "text-indigo-400 font-medium" : "text-white/40"
          )}>Settings</span>
        </Link>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg
            border border-transparent hover:bg-red-500/[0.07]
            hover:border-red-500/[0.15] transition-colors group w-full text-left">
          <LogOut className="w-4 h-4 text-white/25 group-hover:text-red-400 transition-colors" />
          <span className="text-[13px] text-white/30 group-hover:text-red-400 transition-colors">
            Sign out
          </span>
        </button>

        {/* Profile */}
        <Link href="/profile"
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg
            hover:bg-white/[0.05] transition-colors mt-1 border-t border-white/[0.06] pt-3">
          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center
            justify-center text-xs font-medium text-white flex-shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/75 truncate">{userName}</p>
            <p className="text-[10px] text-white/30">Level {level} · {xp} XP</p>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
