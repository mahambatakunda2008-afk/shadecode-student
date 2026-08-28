"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { X, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOTTOM_PRIMARY, BOTTOM_MORE, isRouteActive } from "@/lib/navigation";
import { useNavBadges } from "@/hooks/useNavBadges";
import { useUser } from "@/contexts/UserContext";
import { getAcademicExperience, normalizeStudyLevel } from "@/lib/academic/experience";

function filterItems<T extends { href: string }>(items: T[], experience: ReturnType<typeof getAcademicExperience>) {
  return items.filter((item) => {
    if (item.href === "/exam-hub") return experience.showExamHub;
    if (item.href === "/exam-sim") return experience.showExamSim;
    if (item.href === "/leaderboard") return experience.showLeaderboard;
    if (experience.navMode === "foundation" && ["/analytics", "/cortex", "/share"].includes(item.href)) return false;
    if (experience.navMode === "tertiary" && ["/leaderboard", "/achievements"].includes(item.href)) return false;
    if (experience.navMode === "professional" && ["/exam-hub", "/exam-sim", "/leaderboard"].includes(item.href)) return false;
    return true;
  });
}

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { profile } = useUser();
  const experience = getAcademicExperience(normalizeStudyLevel(profile?.study_level));
  const { tasksBadge, tasksUrgent, examsBadge, examsUrgent } = useNavBadges();
  const primaryItems = filterItems(BOTTOM_PRIMARY, experience);
  const moreItems = filterItems(BOTTOM_MORE, experience);

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
        {primaryItems.slice(0, 4).map(({ href, label, icon: Icon, badge: staticBadge, urgent: staticUrgent }) => {
          const { badge, urgent } = resolveBadge(href, staticBadge, staticUrgent);
          const active = isRouteActive(pathname, href);
          return <Link key={href} href={href} aria-current={active ? "page" : undefined} className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-[5px] px-1 pt-[10px] pb-[9px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset">
            <div className={cn("relative flex h-[26px] w-10 items-center justify-center rounded-full transition-all duration-200", active ? "bg-[var(--primary-glow)]" : "bg-transparent")}>
              <Icon className={cn("h-5 w-5 transition-all duration-200", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} strokeWidth={active ? 2.2 : 1.8} />
              {badge && <span aria-label={`${badge} notification`} className={cn("absolute -right-[7px] -top-[5px] flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-[3px] text-[8px] font-bold leading-none", urgent ? "bg-[var(--danger)] text-white" : "bg-[var(--primary)] text-white")}>{badge}</span>}
            </div>
            <span className={cn("truncate text-[10px] font-medium leading-none transition-colors duration-200", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>{label}</span>
          </Link>;
        })}
        <button type="button" aria-label="Open more navigation" aria-expanded={open} onClick={() => setOpen(true)} className="flex min-w-0 flex-1 flex-col items-center justify-center gap-[5px] px-1 pt-[10px] pb-[9px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset">
          <div className={cn("flex h-[26px] w-10 items-center justify-center rounded-full transition-all duration-200", anyMoreActive || open ? "bg-[var(--primary-glow)]" : "bg-transparent")}><MoreHorizontal className={cn("h-5 w-5 transition-colors duration-200", anyMoreActive || open ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} strokeWidth={1.8} /></div>
          <span className={cn("text-[10px] font-medium leading-none transition-colors duration-200", anyMoreActive || open ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>More</span>
        </button>
      </nav>
      {open && <div className="fixed inset-0 z-[9998] bg-black/60" role="presentation" onClick={() => setOpen(false)} />}
      {open && <div role="dialog" aria-modal="true" aria-label={`${experience.label} navigation`} className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-[22px] border-t border-[var(--card-border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 20px)", animation: "ssc-slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards" }}>
        <div className="mx-auto mb-[18px] mt-[14px] h-[3px] w-8 rounded-full bg-[var(--surface-3)]" />
        <div className="mb-[18px] flex items-center justify-between px-5"><div><span className="block text-[14px] font-semibold text-[var(--foreground)]">{experience.shortLabel}</span><span className="text-[10px] text-[var(--muted-foreground)]">Your study space</span></div><button type="button" aria-label="Close more navigation" onClick={() => setOpen(false)} className="ssc-icon-button h-7 w-7 rounded-full"><X className="h-[14px] w-[14px]" /></button></div>
        <div className="grid grid-cols-3 gap-[10px] px-4 pb-2">
          {moreItems.map(({ href, label, icon: Icon, badge: staticBadge, urgent: staticUrgent }) => {
            const { badge, urgent } = resolveBadge(href, staticBadge, staticUrgent);
            const active = isRouteActive(pathname, href);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)} className={cn("relative flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-[18px] outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--primary)]", active ? "border-[var(--primary)]/30 bg-[var(--primary-glow)]" : "border-[var(--card-border)] bg-[var(--surface-2)] active:bg-[var(--surface-3)]")}>{badge && <span aria-label={`${badge} notification`} className={cn("absolute right-2 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[8px] font-bold leading-none", urgent ? "bg-[var(--danger-soft)] text-[var(--danger)]" : "bg-[var(--primary-glow)] text-[var(--primary)]")}>{badge}</span>}<Icon className={cn("h-[21px] w-[21px] transition-colors duration-150", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} strokeWidth={active ? 2.2 : 1.8} /><span className={cn("text-center text-[11px] font-medium leading-tight", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>{label}</span></Link>;
          })}
        </div>
      </div>}
      <style>{`@keyframes ssc-slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </>
  );
}
