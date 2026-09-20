"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { X, MoreHorizontal } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/utils";
import { getExperienceNavGroups, NAV_ITEMS, isRouteActive } from "@/lib/navigation";
import { useNavBadges } from "@/hooks/useNavBadges";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const groups = getExperienceNavGroups(experience, profile?.curriculum_subjects, profile?.subjects);
  const { tasksBadge, tasksUrgent, examsBadge, examsUrgent } = useNavBadges();
  const allItems = groups.flatMap(group => group.items);
  const family = experience.family;
  const primaryCandidates = family === "foundation"
    ? [NAV_ITEMS.dashboard, NAV_ITEMS.learn, NAV_ITEMS.achievements]
    : family === "school"
      ? [NAV_ITEMS.dashboard, NAV_ITEMS.learn, NAV_ITEMS.compLab, NAV_ITEMS.examSim]
      : [NAV_ITEMS.dashboard, NAV_ITEMS.curriculum, NAV_ITEMS.compLab, NAV_ITEMS.projects];
  const availablePrimary = primaryCandidates.filter(item => allItems.some(available => available.href === item.href));
  const dashboardItem = availablePrimary.find(item => item.href === "/dashboard") ?? NAV_ITEMS.dashboard;
  const sideItems = availablePrimary.filter(item => item.href !== "/dashboard").slice(0, 3);
  const visibleSideItems = sideItems;
  const moreItems = [...allItems, NAV_ITEMS.settings].filter(
    (item, index, items) =>
      item.href !== "/dashboard" &&
      !visibleSideItems.some(visible => visible.href === item.href) &&
      items.findIndex(candidate => candidate.href === item.href) === index,
  );
  const primaryLabel = (href: string, fallback: string) => {
    if (href === "/dashboard") return "Home";
    if (href === "/comp-lab") return "Comp Lab";
    if (family === "foundation" && href === "/achievements") return "Milestones";
    if (family === "beyond-school" && href === "/curriculum") return "Courses";
    return fallback;
  };
  const moreTitle = family === "foundation" ? "Keep exploring" : family === "school" ? "More study tools" : "More workspace tools";
  const resolveBadge = (href: string, staticBadge?: string, staticUrgent?: boolean) => {
    if (href === "/tasks") return { badge: tasksBadge, urgent: tasksUrgent };
    if (href === "/exams") return { badge: examsBadge, urgent: examsUrgent };
    return { badge: staticBadge, urgent: staticUrgent };
  };
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  const anyMoreActive = moreItems.some(({ href }) => isRouteActive(pathname, href));
  return (
    <>
      <nav aria-label={`${experience.label} primary navigation`} className="flex w-full items-stretch border-t border-[var(--card-border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {[...visibleSideItems, dashboardItem, ...(moreItems.length > 0 ? [null] : [])].slice(0, 5).map((item) => {
          if (!item) {
            return (
              <button key="more" type="button" aria-label={`Open ${moreTitle}`} aria-expanded={open} onClick={() => setOpen(true)} className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1 pt-2.5 pb-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset">
                <div className={cn("flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200", anyMoreActive || open ? "bg-[var(--primary-glow)]" : "bg-transparent")}>
                  <MoreHorizontal className={cn("h-5 w-5 transition-colors", anyMoreActive || open ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} strokeWidth={1.8} />
                </div>
                <span className={cn("text-[12px] font-medium leading-tight", anyMoreActive || open ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>More</span>
              </button>
            );
          }
          const active = isRouteActive(pathname, item.href);
          const Icon = item.icon;
          if (item.href === "/dashboard") {
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} aria-label="Home" className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pt-1 pb-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset">
                <span className={cn("relative -mt-5 flex h-12 w-12 items-center justify-center rounded-[17px] border shadow-[0_10px_28px_rgba(36,91,255,0.20)] transition-transform duration-200", active ? "border-[var(--primary)]/35 bg-[var(--brand-ink)] scale-105" : "border-[var(--card-border)] bg-[var(--surface)]")}>
                  <span className="absolute inset-0 rounded-[17px] bg-[var(--brand-gradient)] opacity-[0.10]" />
                  <BrandMark className="relative h-8 w-8" aria-hidden="true" />
                </span>
                <span className={cn("text-[11px] font-semibold leading-tight", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>Home</span>
              </Link>
            );
          }
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1 pt-2.5 pb-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset">
              <div className={cn("relative flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200", active ? "bg-[var(--primary-glow)]" : "bg-transparent")}>
                <Icon className={cn("h-5 w-5 transition-all duration-200", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} strokeWidth={active ? 2.2 : 1.8} />
                {(() => {
                  const resolved = resolveBadge(item.href, item.badge, item.urgent);
                  return resolved.badge ? (
                    <span aria-label={`${resolved.badge} notification`} className={cn("absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none", resolved.urgent ? "bg-[var(--danger)] text-white" : "bg-[var(--primary)] text-white")}>{resolved.badge}</span>
                  ) : null;
                })()}
              </div>
              <span className={cn("truncate text-[12px] font-medium leading-tight transition-colors duration-200", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>{primaryLabel(item.href, item.label)}</span>
            </Link>
          );
        })}
      </nav>

