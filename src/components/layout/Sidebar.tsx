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
      "transition-all duration-150 outline-none",
      // State
      active
        ? "bg-indigo-500/[0.1] text-white font-semibold"
        : "font-medium text-white/[0.42] hover:text-white/80 hover:bg-white/[0.04]"
    );
  }

  function iconClass(active: boolean) {
    return cn(
      // 18px icon per design spec
      "w-[18px] h-[18px] flex-shrink-0 transition-colors duration-150",
      active
        ? "text-indigo-400"
        : "text-white/[0.28] group-hover:text-white/55"
    );
  }

  return (
    <aside className="flex flex-col h-full w-full bg-[#0e0e18] border-r border-white/[0.06] overflow-hidden">

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
          <span className="text-[13px] font-semibold text-white leading-none tracking-[-0.01em]">
            Shadecode
          </span>
          <span className="text-[11px] text-white/[0.28] leading-none">
            Student
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className="mx-4 border-t border-white/[0.06] mb-3 flex-shrink-0" />

      {/* ── User identity card ────────────────────────────────────────────── */}
      {/* 12px horizontal margin, 12px internal padding — on the 8px scale */}
      {profile && (
        <div className="mx-3 mb-3 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-2">
            {/* Avatar: 28px = 4px border + 24px content — harmonizes with 8px grid */}
            <div className="w-7 h-7 rounded-full bg-indigo-500/[0.18] border border-indigo-500/[0.28] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-indigo-400">
                {initials}
              </span>
            </div>
            {/* Name + level */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white/85 truncate leading-none">
                {firstName}
              </p>
              <p className="text-[11px] text-white/[0.28] mt-[3px] leading-none">
                Level {profile.level}
              </p>
            </div>
            {/* Streak */}
            {profile.streak > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Flame className="w-3 h-3 text-orange-400" />
                <span className="text-[11px] font-bold text-orange-400 tabular-nums leading-none">
                  {profile.streak}
                </span>
              </div>
            )}
          </div>
          {/* XP progress bar — 4px track */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[3px] rounded-full bg-white/[0.07] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${xpPercent}%`,
                  background: "linear-gradient(90deg, #6366f1, #818cf8)",
                }}
              />
            </div>
            <span className="text-[10px] text-white/[0.22] leading-none tabular-nums flex-shrink-0">
              {profile.xp}
              <span className="text-white/[0.12]">/{profile.xp_to_next_level}</span>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.22] px-3 mb-2 select-none">
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
                        className="absolute left-0 inset-y-0 w-[2px] bg-indigo-500"
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
                            ? "bg-red-500/[0.12] text-red-400 border border-red-500/[0.18]"
                            : "bg-indigo-500/[0.12] text-indigo-400/80 border border-indigo-500/[0.18]"
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
      <div className="flex-shrink-0 px-3 pb-4 pt-3 border-t border-white/[0.05] flex flex-col gap-[2px]">

        {/* Settings — same component density as nav items */}
        <Link
          href={NAV_ITEMS.settings.href}
          className={navItemClass(isRouteActive(pathname, NAV_ITEMS.settings.href))}
        >
          {isRouteActive(pathname, NAV_ITEMS.settings.href) && (
            <span
              className="absolute left-0 inset-y-0 w-[2px] bg-indigo-500"
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
            "text-[13px] font-medium leading-none transition-all duration-150",
            "text-white/[0.3] hover:text-red-400/75 hover:bg-red-500/[0.06]"
          )}
        >
          <LogOut
            className="w-[18px] h-[18px] flex-shrink-0 text-white/[0.22] group-hover:text-red-400/60 transition-colors duration-150"
            strokeWidth={1.8}
          />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
