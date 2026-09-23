"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { MoreHorizontal } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ShadecodeFeatureIcon } from "@/components/brand/ShadecodeFeatureIcon";
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
  const allItems = groups.flatMap((group) => group.items);
  const family = experience.family;

  const primaryCandidates =
    family === "foundation"
      ? [NAV_ITEMS.dashboard, NAV_ITEMS.learn, NAV_ITEMS.tasks, NAV_ITEMS.achievements]
      : family === "school"
        ? [NAV_ITEMS.dashboard, NAV_ITEMS.learn, NAV_ITEMS.compLab, NAV_ITEMS.examSim]
        : [NAV_ITEMS.dashboard, NAV_ITEMS.curriculum, NAV_ITEMS.compLab, NAV_ITEMS.projects];

  const availablePrimary = primaryCandidates.filter((item) =>
    allItems.some((available) => available.href === item.href),
  );
  const dashboardItem =
    availablePrimary.find((item) => item.href === "/dashboard") ?? NAV_ITEMS.dashboard;
  const sideItems = availablePrimary
    .filter((item) => item.href !== "/dashboard")
    .slice(0, 3);
  const leftCount = Math.ceil(sideItems.length / 2);
  const leftItems = sideItems.slice(0, leftCount);
  const rightItems = sideItems.slice(leftCount);

  const moreItems = [...allItems, NAV_ITEMS.settings].filter(
    (item, index, items) =>
      item.href !== "/dashboard" &&
      !sideItems.some((visible) => visible.href === item.href) &&
      items.findIndex((candidate) => candidate.href === item.href) === index,
  );

  const primaryLabel = (href: string, fallback: string) => {
    if (href === "/dashboard") return "Home";
    if (href === "/comp-lab") return "Code Lab";
    if (family === "foundation" && href === "/achievements") return "Milestones";
    if (family === "beyond-school" && href === "/curriculum") return "Courses";
    return fallback;
  };

  const moreTitle =
    family === "foundation"
      ? "Keep exploring"
      : family === "school"
        ? "More study tools"
        : "More workspace tools";

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
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const anyMoreActive = moreItems.some(({ href }) => isRouteActive(pathname, href));

  const renderNavItem = (item: (typeof NAV_ITEMS)[keyof typeof NAV_ITEMS]) => {
    const active = isRouteActive(pathname, item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={primaryLabel(item.href, item.label)}
        className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pt-2.5 pb-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset"
      >
        <span
          className={cn(
            "relative flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200",
            active ? "bg-[var(--primary-glow)] text-[var(--primary)]" : "bg-transparent text-[var(--muted-foreground)]",
          )}
        >
          <ShadecodeFeatureIcon icon={Icon} feature={item.feature} size="sm" tile={false} active={active} />
          {(() => {
            const resolved = resolveBadge(item.href, item.badge, item.urgent);
            return resolved.badge ? (
              <span
                aria-label={resolved.badge + " notification"}
                className={cn(
                  "absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none",
                  resolved.urgent
                    ? "bg-[var(--danger)] text-white"
                    : "bg-[var(--primary)] text-white",
                )}
              >
                {resolved.badge}
              </span>
            ) : null;
          })()}
        </span>
        <span
          className={cn(
            "truncate text-[11px] font-medium leading-tight transition-colors duration-200",
            active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]",
          )}
        >
          {primaryLabel(item.href, item.label)}
        </span>
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label={experience.label + " primary navigation"}
        className="flex w-full items-stretch border-t border-[var(--card-border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {leftItems.map(renderNavItem)}

        <Link
          href={dashboardItem.href}
          aria-current={isRouteActive(pathname, dashboardItem.href) ? "page" : undefined}
          aria-label="Home"
          className="relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pt-1 pb-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset"
        >
          <span
            className={cn(
              "relative -mt-5 flex h-12 w-12 items-center justify-center rounded-[17px] border shadow-[0_10px_28px_rgba(36,91,255,0.20)] transition-transform duration-200",
              isRouteActive(pathname, dashboardItem.href)
                ? "scale-105 border-[var(--primary)]/35 bg-[var(--brand-ink)]"
                : "border-[var(--card-border)] bg-[var(--surface)]",
            )}
          >
            <span
              className="absolute inset-0 rounded-[17px] opacity-[0.12]"
              style={{ background: "var(--brand-gradient)" }}
              aria-hidden="true"
            />
            <BrandMark className="relative h-8 w-8" aria-hidden="true" />
          </span>
          <span
            className={cn(
              "text-[11px] font-semibold leading-tight",
              isRouteActive(pathname, dashboardItem.href)
                ? "text-[var(--primary)]"
                : "text-[var(--muted-foreground)]",
            )}
          >
            Home
          </span>
        </Link>

        {rightItems.map(renderNavItem)}

        {moreItems.length > 0 && (
          <button
            type="button"
            aria-label={"Open " + moreTitle}
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-1 pt-2.5 pb-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset"
          >
            <span
              className={cn(
                "flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200",
                anyMoreActive || open ? "bg-[var(--primary-glow)]" : "bg-transparent",
              )}
            >
              <MoreHorizontal
                className="h-5 w-5 text-[var(--primary)]"
                stroke="currentColor"
                strokeWidth={anyMoreActive || open ? 2.1 : 1.8}
              />
            </span>
            <span
              className={cn(
                "text-[11px] font-medium leading-tight",
                anyMoreActive || open
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)]",
              )}
            >
              More
            </span>
          </button>
        )}
      </nav>

      {open && (
        <div
          className="fixed inset-0 z-[10000] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={moreTitle}
        >
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <section className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-[28px] border border-[var(--card-border)] bg-[var(--surface)] p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] shadow-[var(--shadow-lg)]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                  Shadecode Student
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">{moreTitle}</h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="ssc-icon-button"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {moreItems.map((item) => {
                const active = isRouteActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-2xl border p-2.5 text-center transition-all",
                      active
                        ? "border-[color-mix(in_srgb,var(--primary)_42%,transparent)] bg-[var(--primary-glow)]"
                        : "border-[var(--card-border)] bg-[var(--surface-2)]",
                    )}
                  >
                    <ShadecodeFeatureIcon icon={item.icon} feature={item.feature} size="sm" active={active} />
                    <span
                      className={cn(
                        "text-[11px] font-medium leading-tight",
                        active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]",
                      )}
                    >
                      {primaryLabel(item.href, item.label)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
