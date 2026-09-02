"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Flame, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { SIDEBAR_GROUPS, NAV_ITEMS, isRouteActive } from "@/lib/navigation";
import { useNavBadges } from "@/hooks/useNavBadges";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

const HIDE_FOR_FOUNDATION = new Set(["/exam-hub", "/exam-sim", "/analytics", "/cortex", "/share"]);
const HIDE_FOR_TERTIARY = new Set(["/exam-hub", "/leaderboard", "/achievements"]);
const HIDE_FOR_PROFESSIONAL = new Set(["/exam-hub", "/exam-sim", "/leaderboard"]);

function visibleHref(href: string, mode: string, showExamHub: boolean, showExamSim: boolean, showLeaderboard: boolean): boolean {
  if (href === "/exam-hub" && !showExamHub) return false;
  if (href === "/exam-sim" && !showExamSim) return false;
  if (href === "/leaderboard" && !showLeaderboard) return false;
  if (mode === "foundation" && HIDE_FOR_FOUNDATION.has(href)) return false;
  if (mode === "tertiary" && HIDE_FOR_TERTIARY.has(href)) return false;
  if (mode === "professional" && HIDE_FOR_PROFESSIONAL.has(href)) return false;
  return true;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUser();
  const { tasksBadge, tasksUrgent, examsBadge, examsUrgent } = useNavBadges();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));

  const resolveBadge = (href: string, staticBadge?: string, staticUrgent?: boolean) => {
    if (href === "/tasks") return { badge: tasksBadge, urgent: tasksUrgent };
    if (href === "/exams") return { badge: examsBadge, urgent: examsUrgent };
    return { badge: staticBadge, urgent: staticUrgent };
  };

  const firstName = profile?.first_name ?? profile?.full_name?.split(" ")[0] ?? "Student";
  const initials = firstName.slice(0, 2).toUpperCase();
  const xpPercent = profile ? Math.min(Math.round((profile.xp / (profile.xp_to_next_level || 1000)) * 100), 100) : 0;

  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined" && "caches" in window) {
      await Promise.allSettled([caches.delete("shadecode-pages"), caches.delete("shadecode-rsc"), caches.delete("shadecode-api")]);
    }
    router.replace("/auth/login");
  };

  function navItemClass(active: boolean) {
    return cn(
      "group relative flex items-center justify-between min-h-[44px] px-3 py-2.5 rounded-[10px] overflow-hidden",
      "text-[14px] leading-snug transition-all duration-200 outline-none",
      active
        ? "bg-[var(--primary-glow)] text-[var(--foreground)] font-semibold shadow-sm"
        : "font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]"
    );
  }

  function iconClass(active: boolean) {
    return cn(
      "w-[19px] h-[19px] flex-shrink-0 transition-colors duration-150",
      active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]"
    );
  }

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-[var(--card-border)] bg-[var(--surface)]" data-study-level={experience.stage}>
      <div className="flex items-center px-4 pt-4 pb-4 flex-shrink-0">
        <Link href="/dashboard" aria-label="Shadecode Student dashboard" className="min-w-0"><BrandLockup compact /></Link>
      </div>
      <div className="mx-4 mb-3 flex-shrink-0 border-t border-[var(--card-border)]" />

      {profile && (
        <div className="mx-3 mb-3 flex-shrink-0 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] px-3 py-3 shadow-sm">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary-glow)] border border-[var(--card-border)] flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] font-bold text-[var(--primary)]">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[var(--foreground)] truncate leading-tight">{firstName}</p>
              <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5 leading-tight">{experience.shortLabel} · Level {profile.level}</p>
            </div>
            {profile.streak > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0" title={`${profile.streak} day streak`}>
                <Flame className="w-4 h-4 text-[var(--warning)]" />
                <span className="text-[12px] font-bold text-[var(--warning)] tabular-nums leading-none">{profile.streak}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 bg-[var(--primary)]" style={{ width: `${xpPercent}%` }} />
            </div>
            <span className="text-[12px] text-[var(--muted-foreground)] leading-none tabular-nums flex-shrink-0">{profile.xp}<span className="opacity-50">/{profile.xp_to_next_level}</span></span>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-5 py-2 min-h-0" aria-label={`${experience.label} navigation`}>
        {SIDEBAR_GROUPS.map((section) => {
          const items = section.items.filter((item) => visibleHref(item.href, experience.navMode, experience.showExamHub, experience.showExamSim, experience.showLeaderboard));
          if (!items.length) return null;
          return <div key={section.group}>
            <p className="ssc-nav-label text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)] px-3 mb-2 select-none">{section.group}</p>
            <div className="flex flex-col gap-1">
              {items.map(({ href, label, icon: Icon, badge: staticBadge, urgent: staticUrgent }) => {
                const { badge, urgent } = resolveBadge(href, staticBadge, staticUrgent);
                const active = isRouteActive(pathname, href);
                return <Link key={href} href={href} className={navItemClass(active)}>
                  {active && <span className="absolute left-0 inset-y-0 w-[3px] rounded-r-full bg-[var(--primary)]" aria-hidden="true" />}
                  <div className="flex items-center gap-3"><Icon className={iconClass(active)} strokeWidth={active ? 2 : 1.8} /><span>{label}</span></div>
                  {badge && <span className={cn("px-1.5 py-1 rounded-md text-[11px] font-bold leading-none tabular-nums", urgent ? "bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--card-border)]" : "bg-[var(--primary-glow)] text-[var(--primary)] border border-[var(--card-border)]")}>{badge}</span>}
                </Link>;
              })}
            </div>
          </div>;
        })}
      </nav>

      <div className="flex-shrink-0 px-3 pb-4 pt-3 border-t border-[var(--card-border)] flex flex-col gap-1">
        <Link href={NAV_ITEMS.settings.href} className={navItemClass(isRouteActive(pathname, NAV_ITEMS.settings.href))}>
          {isRouteActive(pathname, NAV_ITEMS.settings.href) && <span className="absolute left-0 inset-y-0 w-[3px] rounded-r-full bg-[var(--primary)]" aria-hidden="true" />}
          <div className="flex items-center gap-3"><NAV_ITEMS.settings.icon className={iconClass(isRouteActive(pathname, NAV_ITEMS.settings.href))} strokeWidth={1.8} /><span>Settings</span></div>
        </Link>
        <button onClick={handleSignOut} className={cn("group relative flex items-center gap-3 min-h-[44px] px-3 py-2.5 rounded-[10px] w-full text-left cursor-pointer", "text-[14px] font-medium leading-snug transition-all duration-200 text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)]")}>
          <LogOut className="w-[19px] h-[19px] flex-shrink-0 text-[var(--muted-foreground)] group-hover:text-[var(--danger)] transition-colors duration-150" strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
