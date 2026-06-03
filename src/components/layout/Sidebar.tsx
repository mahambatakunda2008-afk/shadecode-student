"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Flame, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { SIDEBAR_GROUPS, NAV_ITEMS, isRouteActive } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUser();

  const firstName =
    profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "Student";
  const initials = firstName.slice(0, 2).toUpperCase();
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

  return (
    <aside className="flex flex-col h-full w-full bg-[#0e0e18] border-r border-white/[0.06] overflow-hidden">
      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-[18px] flex-shrink-0">
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
          <span className="text-[10px] text-white/[0.28] leading-none">
            Student
          </span>
        </div>
      </div>

      {/* ── User identity card ────────────────────────────────────────── */}
      {profile && (
        <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-[9px]">
            {/* Avatar */}
            <div className="w-[26px] h-[26px] rounded-full bg-indigo-500/[0.18] border border-indigo-500/[0.28] flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-indigo-400">
                {initials}
              </span>
            </div>
            {/* Name + level */}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white/85 truncate leading-none">
                {firstName}
              </p>
              <p className="text-[9px] text-white/[0.28] mt-[3px] leading-none">
                Level {profile.level}
              </p>
            </div>
            {/* Streak */}
            {profile.streak > 0 && (
              <div className="flex items-center gap-[3px] flex-shrink-0">
                <Flame className="w-[11px] h-[11px] text-orange-400" />
                <span className="text-[10px] font-bold text-orange-400 tabular-nums leading-none">
                  {profile.streak}
                </span>
              </div>
            )}
          </div>
          {/* XP bar */}
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
            <span className="text-[9px] text-white/[0.22] leading-none tabular-nums flex-shrink-0">
              {profile.xp}
              <span className="text-white/[0.12]">/{profile.xp_to_next_level}</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Navigation groups ─────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-[18px] py-2 min-h-0">
        {SIDEBAR_GROUPS.map((section) => (
          <div key={section.group}>
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/[0.2] px-2.5 mb-[7px] select-none">
              {section.group}
            </p>
            <div className="flex flex-col gap-[2px]">
              {section.items.map(({ href, label, icon: Icon, badge, urgent }) => {
                const active = isRouteActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "group flex items-center justify-between px-2.5 py-[7px] rounded-[9px]",
                      "text-[13px] font-medium transition-all duration-150 outline-none",
                      active
                        ? "bg-indigo-500/[0.11] text-white"
                        : "text-white/[0.42] hover:text-white/80 hover:bg-white/[0.04]"
                    )}
                  >
                    <div className="flex items-center gap-[9px]">
                      <Icon
                        className={cn(
                          "w-[15px] h-[15px] flex-shrink-0 transition-colors duration-150",
                          active
                            ? "text-indigo-400"
                            : "text-white/[0.28] group-hover:text-white/55"
                        )}
                        strokeWidth={active ? 2.2 : 1.8}
                      />
                      <span className="leading-none">{label}</span>
                    </div>
                    {badge && (
                      <span
                        className={cn(
                          "px-[6px] py-[3px] rounded-md text-[9px] font-bold leading-none tabular-nums",
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

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 pb-4 pt-2 border-t border-white/[0.05] flex flex-col gap-[2px]">
        {/* Settings */}
        <Link
          href={NAV_ITEMS.settings.href}
          className={cn(
            "group flex items-center gap-[9px] px-2.5 py-[7px] rounded-[9px]",
            "text-[13px] font-medium transition-all duration-150 outline-none",
            isRouteActive(pathname, NAV_ITEMS.settings.href)
              ? "bg-indigo-500/[0.11] text-white"
              : "text-white/[0.42] hover:text-white/80 hover:bg-white/[0.04]"
          )}
        >
          <NAV_ITEMS.settings.icon
            className={cn(
              "w-[15px] h-[15px] flex-shrink-0 transition-colors duration-150",
              isRouteActive(pathname, NAV_ITEMS.settings.href)
                ? "text-indigo-400"
                : "text-white/[0.28] group-hover:text-white/55"
            )}
            strokeWidth={1.8}
          />
          <span className="leading-none">Settings</span>
        </Link>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className={cn(
            "group flex items-center gap-[9px] px-2.5 py-[7px] rounded-[9px] w-full text-left cursor-pointer",
            "text-[13px] font-medium transition-all duration-150",
            "text-white/[0.3] hover:text-red-400/75 hover:bg-red-500/[0.06]"
          )}
        >
          <LogOut
            className="w-[15px] h-[15px] flex-shrink-0 text-white/[0.22] group-hover:text-red-400/60 transition-colors duration-150"
            strokeWidth={1.8}
          />
          <span className="leading-none">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
