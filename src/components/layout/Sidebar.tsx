"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";

// ─── Nav structure ────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: string;         // Lucide icon name — rendered via CSS class
  badge?: string | null;
  section?: "study" | "organize" | "progress" | "account";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFirstName(profile: { full_name?: string | null; first_name?: string | null } | null): string | null {
  if (!profile) return null;
  if (profile.first_name) return profile.first_name;
  if (profile.full_name) return profile.full_name.split(" ")[0] ?? null;
  return null;
}

function getLevelProgress(xp: number, xpToNext: number): number {
  if (xpToNext <= 0) return 100;
  return Math.min(100, Math.round((xp / xpToNext) * 100));
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-5 animate-pulse">
      <div className="h-4 w-24 rounded-full bg-white/10" />
      <div className="h-3 w-36 rounded-full bg-white/10" />
      <div className="mt-3 h-8 w-full rounded-xl bg-white/10" />
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 w-full rounded-lg bg-white/10" />
        ))}
      </div>
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavLink({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      title={item.label}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
        "hover:bg-white/8",
        isActive
          ? "bg-indigo-500/15 text-indigo-300"
          : "text-white/55 hover:text-white/90"
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-indigo-400" />
      )}

      {/* Icon slot — kept as a named span so icons can be swapped */}
      <NavIcon name={item.icon} active={isActive} />

      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                isActive
                  ? "bg-indigo-500/30 text-indigo-300"
                  : "bg-white/10 text-white/50"
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

// Inline icon map — avoids bundle bloat from importing all of lucide
function NavIcon({ name, active }: { name: string; active: boolean }) {
  const icons: Record<string, string> = {
    home:         "M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H14v-6h-4v6H4a1 1 0 01-1-1V9.5z",
    brain:        "M9.5 2a5.5 5.5 0 015.5 5.5v1A5.5 5.5 0 019.5 14H7a5 5 0 000 10h10M14.5 2A5.5 5.5 0 0120 7.5v1A5.5 5.5 0 0114.5 14H17",
    list:         "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    timer:        "M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z",
    layout:       "M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 3h7",
    calendar:     "M8 7V3M16 7V3M3 11h18M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    "file-text":  "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8L14 2zM14 2v6h6M16 13H8M16 17H8M10 9H8",
    "play-circle":"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM10 8l6 4-6 4V8z",
    calculator:   "M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm3 4h8M8 12h2m4 0h2M8 16h2m4 0h2",
    "bar-chart":  "M18 20V10M12 20V4M6 20v-6",
    trophy:       "M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z",
    settings:     "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  };

  const d = icons[name] ?? icons["home"];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "h-4 w-4 shrink-0 transition-colors",
        active ? "text-indigo-400" : "text-white/40 group-hover:text-white/70"
      )}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">
      {label}
    </p>
  );
}

// ─── XP bar ───────────────────────────────────────────────────────────────────

function XPBar({ xp, xpToNext, level }: { xp: number; xpToNext: number; level: number }) {
  const pct = getLevelProgress(xp, xpToNext);
  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-indigo-400/80 uppercase tracking-wider">
          Level {level}
        </span>
        <span className="text-[10px] text-white/35 tabular-nums">
          {xp} / {xpToNext} XP
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Streak badge ─────────────────────────────────────────────────────────────

function StreakBadge({ streak, message }: { streak: number; message: string | null }) {
  return (
    <div className="mx-4 mb-4 rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-base" role="img" aria-label="fire">🔥</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-amber-300/90 tabular-nums">
            {streak}d streak
          </p>
          {message && (
            <p className="truncate text-[10px] text-amber-300/50">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Search bar ───────────────────────────────────────────────────────────────

function SearchBar() {
  return (
    <button
      type="button"
      className="mx-4 mb-4 flex w-[calc(100%-2rem)] items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-sm text-white/40 transition-colors hover:border-white/15 hover:bg-white/8 hover:text-white/60"
      onClick={() => {
        // Trigger command palette — wire to your existing Ctrl+K handler
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span className="flex-1 text-left text-xs">Search anything…</span>
      <kbd className="hidden rounded border border-white/10 bg-white/8 px-1.5 py-0.5 text-[9px] font-mono text-white/30 sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}

// ─── Mobile bottom nav ────────────────────────────────────────────────────────

function MobileNav({ taskCount }: { taskCount: number | null }) {
  const pathname = usePathname();

  const items: { href: string; label: string; icon: string; badge?: string }[] = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/learn", label: "AI Learn", icon: "brain" },
    {
      href: "/tasks",
      label: "Tasks",
      icon: "list",
      ...(taskCount != null && taskCount > 0 ? { badge: String(taskCount) } : {}),
    },
    { href: "/focus", label: "Focus", icon: "timer" },
    { href: "/dashboard", label: "Dashboard", icon: "layout" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/8 bg-[#0d0d14]/95 px-2 py-2 backdrop-blur-md sm:hidden"
      aria-label="Mobile navigation"
    >
      {items.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-medium transition-colors",
              isActive ? "text-indigo-400" : "text-white/40"
            )}
          >
            <NavIcon name={item.icon} active={isActive} />
            <span>{item.label}</span>
            {item.badge && (
              <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-bold text-white tabular-nums">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function Sidebar() {
  const { profile, loading } = useUser();
  const [collapsed, setCollapsed] = useState(false);

  // Persist collapse preference
  useEffect(() => {
    const stored = localStorage.getItem("sidebar:collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar:collapsed", String(!prev));
      return !prev;
    });
  };

  const firstName = getFirstName(profile);
  const greeting = getGreeting();

  // Build nav items — badges are driven by real data, never hardcoded
  const taskBadge = profile ? null : null; // Wire to real task count from context/query
  const examDaysBadge = null; // Wire to real upcoming exam from context/query

  const studyItems: NavItem[] = [
    { href: "/learn",        label: "Learn AI",    icon: "brain",       section: "study" },
    { href: "/exam-sim",     label: "Exam Sim",    icon: "play-circle", section: "study" },
    { href: "/math-checker", label: "Math",        icon: "calculator",  section: "study" },
    { href: "/focus",        label: "Focus",       icon: "timer",       section: "study" },
  ];

  const organizeItems: NavItem[] = [
    { href: "/tasks",      label: "Tasks",     icon: "list",      badge: taskBadge,    section: "organize" },
    { href: "/timetable",  label: "Timetable", icon: "calendar",  section: "organize" },
    { href: "/exams",      label: "Exams",     icon: "file-text", badge: examDaysBadge, section: "organize" },
  ];

  const progressItems: NavItem[] = [
    { href: "/dashboard",   label: "Dashboard", icon: "layout",     section: "progress" },
    { href: "/analytics",   label: "Analytics", icon: "bar-chart",  section: "progress" },
    { href: "/leaderboard", label: "Ranks",     icon: "trophy",     section: "progress" },
  ];

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "relative hidden h-screen flex-col border-r border-white/8 bg-[#0d0d14] transition-all duration-300 sm:flex",
          collapsed ? "w-16" : "w-60"
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-white/90">
                ◈ Shadecode <span className="text-indigo-400">Student</span>
              </span>
            </Link>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/8 hover:text-white/70"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* User greeting — only renders when authenticated & profile loaded */}
        {!collapsed && (
          <>
            {loading ? (
              <SidebarSkeleton />
            ) : profile ? (
              <>
                {/* Greeting */}
                <div className="px-4 pb-3">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-white/30">
                    {greeting},
                  </p>
                  <p className="text-base font-semibold text-white/90">
                    {firstName ?? "Student"} 👋
                  </p>
                </div>

                {/* Streak */}
                {profile.streak > 0 && (
                  <StreakBadge
                    streak={profile.streak}
                    message={profile.streak_message}
                  />
                )}

                {/* XP */}
                <XPBar
                  xp={profile.xp}
                  xpToNext={profile.xp_to_next_level}
                  level={profile.level}
                />

                {/* Search */}
                <SearchBar />
              </>
            ) : (
              // Unauthenticated — show only search, no personal data
              <div className="px-4 pb-4">
                <SearchBar />
              </div>
            )}
          </>
        )}

        {/* Nav — always visible, even for unauthenticated (links will redirect) */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Sidebar navigation">
          {/* Home — always first */}
          <NavLink item={{ href: "/", label: "Home", icon: "home" }} collapsed={collapsed} />

          {!collapsed && <SectionLabel label="Study" />}
          {studyItems.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}

          {!collapsed && <SectionLabel label="Organise" />}
          {organizeItems.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}

          {!collapsed && <SectionLabel label="Progress" />}
          {progressItems.map((item) => (
            <NavLink key={item.href} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Settings — pinned to bottom */}
        <div className="border-t border-white/8 px-2 py-3">
          <NavLink
            item={{ href: "/settings", label: "Settings", icon: "settings" }}
            collapsed={collapsed}
          />
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <MobileNav taskCount={null} />
    </>
  );
}
