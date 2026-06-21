"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Flame, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { SIDEBAR_GROUPS, NAV_ITEMS, isRouteActive } from "@/lib/navigation";

// ─── Design tokens (mirrored from globals.css for component use) ──────────────
// Item height: 40px = py-[11px] top+bottom + 18px icon
// Icon:        18px
// Section labels: 11px
// Group gap:   20px (within 16–24px spec)
// Item gap:    2px (dense within a group)

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { profile } = useUser();

  const firstName =
    profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "Student";
  const initials  = firstName.slice(0, 2).toUpperCase();
  const xpPercent = profile
    ? Math.min(
        Math.round((profile.xp / (profile.xp_to_next_level || 1000)) * 100),
        100
      )
    : 0;

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

  // ── Shared item class builder ──────────────────────────────────────────────
  // Active: indigo tint bg + full-height left accent + semibold text
  // Inactive: muted text, subtle hover
  function navItemClass(active: boolean) {
    return cn(
      // Layout & geometry
      "group relative flex items-center justify-between",
      "min-h-[40px] px-3 py-[11px] rounded-[9px] overflow-hidden",
      // Typography
      "text-[13px] leading-none",
      // Transition
      "transition-all duration-200 outline-none",
      // State
      active
        ? "bg-[var(--primary-glow)] text-[var(--foreground)] font-semibold shadow-sm"
        : "font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
    );
  }

  function iconClass(active: boolean) {
    return cn(
      // 18px icon per design spec
      "w-[18px] h-[18px] flex-shrink-0 transition-colors duration-150",
      active
        ? "text-[var(--primary)]"
        : "text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]"
    );
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[var(--card-border)] bg-[var(--surface)]/90 backdrop-blur-2xl">

      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      {/* 16px padding all sides — on the 8px scale */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 flex-shrink-0">
        <div
          className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #818cf8 100%)",
            boxShadow: "0 0 14px rgba(99,102,241,0.35)",
          }}
        >
          <span className="text-[10px] font-black text-white tracking-tight">
            SC
          </span>
        </div>
        <div className="flex flex-col gap-[3px]">
          <span className="text-[13px] font-semibold text-[var(--foreground)] leading-none">
            Shadecode
          </span>
          <span className="text-[11px] text-[var(--muted-foreground)] leading-none">
            Student
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className="mx-4 mb-3 flex-shrink-0 border-t border-[var(--card-border)]" />

      {/* ── User identity card ────────────────────────────────────────────── */}
      {/* 12px horizontal margin, 12px internal padding — on the 8px scale */}
      {profile && (
        <div className="mx-3 mb-3 flex-shrink-0 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            {/* Avatar: 28px = 4px border + 24px content — harmonizes with 8px grid */}
            <div className="w-7 h-7 rounded-full bg-[var(--primary-glow)] border border-[var(--card-border)] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-[var(--primary)]">
                {initials}
              </span>
            </div>
            {/* Name + level */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[var(--foreground)] truncate leading-none">
                {firstName}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-[3px] leading-none">
                Level {profile.level}
              </p>
            </div>
            {/* Streak */}
            {profile.streak > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Flame className="w-3 h-3 text-[var(--warning)]" />
                <span className="text-[11px] font-bold text-[var(--warning)] tabular-nums leading-none">
                  {profile.streak}
                </span>
              </div>
            )}
          </div>
          {/* XP progress bar — 4px track */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[3px] rounded-full bg-[var(--surface-3)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${xpPercent}%`,
                  background: "linear-gradient(90deg, var(--primary), var(--accent))",
                }}
              />
            </div>
            <span className="text-[10px] text-[var(--muted-foreground)] leading-none tabular-nums flex-shrink-0">
              {profile.xp}
              <span className="opacity-50">/{profile.xp_to_next_level}</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Navigation groups ─────────────────────────────────────────────── */}
      {/* gap-5 = 20px between groups — midpoint of 16–24px spec range */}
      <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-5 py-2 min-h-0">
        {SIDEBAR_GROUPS.map((section) => (
          <div key={section.group}>
            {/* Section label: 11px per spec, uppercase, muted */}
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--muted-foreground)] px-3 mb-2 select-none">
              {section.group}
            </p>

            {/* Items: 2px gap within a group — tight, purposeful density */}
            <div className="flex flex-col gap-[2px]">
              {section.items.map(({ href, label, icon: Icon, badge, urgent }) => {
                const active = isRouteActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={navItemClass(active)}
                  >
                    {/* ── Left accent indicator (active only) ── */}
                    {/* Full-height, clipped by overflow-hidden + rounded-[9px] */}
                    {active && (
                      <span
                        className="absolute left-0 inset-y-0 w-[2px] bg-[var(--primary)]"
                        aria-hidden="true"
                      />
                    )}

                    {/* Icon + label */}
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={iconClass(active)}
                        strokeWidth={active ? 2 : 1.8}
                      />
                      <span>{label}</span>
                    </div>

                    {/* Badge */}
                    {badge && (
                      <span
                        className={cn(
                          "px-[6px] py-[3px] rounded-md text-[10px] font-bold leading-none tabular-nums",
                          urgent
                            ? "bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--card-border)]"
                            : "bg-[var(--primary-glow)] text-[var(--primary)] border border-[var(--card-border)]"
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      {/* 16px bottom, 8px top, separated by a hairline border */}
      <div className="flex-shrink-0 px-3 pb-4 pt-3 border-t border-[var(--card-border)] flex flex-col gap-[2px]">

        {/* Settings — same component density as nav items */}
        <Link
          href={NAV_ITEMS.settings.href}
          className={navItemClass(isRouteActive(pathname, NAV_ITEMS.settings.href))}
        >
          {isRouteActive(pathname, NAV_ITEMS.settings.href) && (
            <span
              className="absolute left-0 inset-y-0 w-[2px] bg-[var(--primary)]"
              aria-hidden="true"
            />
          )}
          <div className="flex items-center gap-2.5">
            <NAV_ITEMS.settings.icon
              className={iconClass(isRouteActive(pathname, NAV_ITEMS.settings.href))}
              strokeWidth={1.8}
            />
            <span>Settings</span>
          </div>
        </Link>

        {/* Sign out — destructive, de-emphasised until hover */}
        <button
          onClick={handleSignOut}
          className={cn(
            "group relative flex items-center gap-2.5",
            "min-h-[40px] px-3 py-[11px] rounded-[9px] w-full text-left cursor-pointer",
            "text-[13px] font-medium leading-none transition-all duration-200",
            "text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]"
          )}
        >
          <LogOut
            className="w-[18px] h-[18px] flex-shrink-0 text-[var(--muted-foreground)] group-hover:text-[var(--danger)] transition-colors duration-150"
            strokeWidth={1.8}
          />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
