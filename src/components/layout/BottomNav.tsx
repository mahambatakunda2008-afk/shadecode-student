"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  LayoutDashboard, Brain, CheckSquare, Timer,
  Calendar, BookOpen, GraduationCap, Calculator,
  BarChart3, Trophy, Settings, X, Grid2x2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";

// ─── Nav config ───────────────────────────────────────────────────────────────

const PRIMARY_ITEMS = [
  { href: "/dashboard",  label: "Home",      icon: LayoutDashboard },
  { href: "/learn",      label: "Learn",     icon: Brain },
  { href: "/tasks",      label: "Tasks",     icon: CheckSquare },
  { href: "/focus",      label: "Focus",     icon: Timer },
  { href: "/exam-sim",   label: "Exam Sim",  icon: GraduationCap },
] as const;

const MORE_ITEMS = [
  { href: "/timetable",    label: "Timetable",    icon: Calendar },
  { href: "/exams",        label: "Exams",        icon: BookOpen },
  { href: "/math-checker", label: "Math",         icon: Calculator },
  { href: "/analytics",    label: "Analytics",    icon: BarChart3 },
  { href: "/leaderboard",  label: "Leaderboard",  icon: Trophy },
  { href: "/settings",     label: "Settings",     icon: Settings },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface BottomNavProps {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

// We accept drawerOpen/setDrawerOpen as props so the parent layout can
// optionally control the drawer. If you prefer self-contained state,
// swap to useState here instead.
export function BottomNav({
  drawerOpen,
  setDrawerOpen,
}: BottomNavProps) {
  const pathname     = usePathname();
  const { profile }  = useUser();
  const drawerRef    = useRef<HTMLDivElement>(null);

  const taskCount = profile ? 3 : 0; // wire to real task count when available

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, setDrawerOpen]);

  // Close drawer on outside tap
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [drawerOpen, setDrawerOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <>
      {/* ── Bottom bar ──────────────────────────────────────────────────── */}
      <nav className="w-full bg-[#0a0a10]/95 backdrop-blur-xl
        border-t border-white/[0.07] flex items-center px-1
        safe-area-pb">

        {PRIMARY_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-[3px] py-[10px] px-1
                relative transition-colors"
            >
              {/* Active dot indicator */}
              {active && (
                <span className="absolute top-[6px] left-1/2 -translate-x-1/2
                  w-1 h-1 rounded-full bg-indigo-400" />
              )}

              <Icon className={cn(
                "w-[22px] h-[22px] transition-colors",
                active ? "text-indigo-400" : "text-white/30"
              )} strokeWidth={active ? 2.5 : 1.8} />

              {/* Task badge */}
              {label === "Tasks" && taskCount > 0 && (
                <span className="absolute top-[8px] right-[calc(50%-18px)]
                  min-w-[16px] h-[16px] px-[4px] rounded-full
                  bg-indigo-500 text-white text-[9px] font-bold
                  flex items-center justify-center leading-none">
                  {taskCount}
                </span>
              )}

              <span className={cn(
                "text-[10px] font-medium transition-colors",
                active ? "text-indigo-400" : "text-white/30"
              )}>
                {label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="flex flex-1 flex-col items-center gap-[3px] py-[10px] px-1
            transition-colors"
        >
          <Grid2x2 className={cn(
            "w-[22px] h-[22px] transition-colors",
            drawerOpen ? "text-indigo-400" : "text-white/30"
          )} strokeWidth={1.8} />
          <span className={cn(
            "text-[10px] font-medium transition-colors",
            drawerOpen ? "text-indigo-400" : "text-white/30"
          )}>
            More
          </span>
        </button>
      </nav>

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm
            animate-in fade-in duration-200"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── More drawer ─────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          ref={drawerRef}
          className="fixed bottom-0 left-0 right-0 z-[9999]
            bg-[#0e0e18] border-t border-white/[0.08]
            rounded-t-[24px] px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+80px)]
            animate-in slide-in-from-bottom duration-250"
        >
          {/* Handle */}
          <div className="w-8 h-1 rounded-full bg-white/10 mx-auto mb-5" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4 px-1">
            <p className="text-[13px] font-semibold text-white/50 uppercase
              tracking-[0.08em]">
              More
            </p>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center
                justify-center transition-colors hover:bg-white/[0.1]"
            >
              <X className="w-[14px] h-[14px] text-white/50" />
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-3 gap-[10px]">
            {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-[8px]",
                    "py-[18px] px-2 rounded-[16px]",
                    "border transition-colors",
                    active
                      ? "bg-indigo-500/[0.14] border-indigo-500/[0.28]"
                      : "bg-white/[0.03] border-white/[0.06] active:bg-white/[0.07]"
                  )}
                >
                  <Icon className={cn(
                    "w-[22px] h-[22px]",
                    active ? "text-indigo-400" : "text-white/50"
                  )} strokeWidth={active ? 2.4 : 1.8} />
                  <span className={cn(
                    "text-[11px] font-semibold text-center leading-tight",
                    active ? "text-indigo-400" : "text-white/55"
                  )}>
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
