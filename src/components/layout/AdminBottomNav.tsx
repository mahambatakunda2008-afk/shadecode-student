"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Ellipsis } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShadecodeFeatureIcon } from "@/components/brand/ShadecodeFeatureIcon";
import { ADMIN_NAV_GROUPS, NAV_ITEMS, isRouteActive, type NavItem } from "@/lib/navigation";

/** The four admin destinations used most on a phone. Everything else lives behind "More" so the bar never crowds. */
const PRIMARY: NavItem[] = [NAV_ITEMS.adminDashboard, NAV_ITEMS.adminManage, NAV_ITEMS.adminModeration, NAV_ITEMS.adminContentReview];

export function AdminBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const all = ADMIN_NAV_GROUPS[0].items;
  const primaryHrefs = new Set(PRIMARY.map((i) => i.href));
  const more = all.filter((i) => !primaryHrefs.has(i.href));
  const moreActive = more.some((i) => isRouteActive(pathname, i.href));

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const cell = "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-[5px] px-1 pt-2 pb-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset";
  const pill = (active: boolean) => cn("relative flex h-[30px] w-10 items-center justify-center rounded-full transition-colors duration-200", active ? "bg-[var(--primary-glow)]" : "bg-transparent");
  const label = (active: boolean) => cn("max-w-full truncate text-[11px] leading-tight transition-colors duration-200", active ? "font-semibold text-[var(--primary)]" : "font-medium text-[var(--muted-foreground)]");

  return (
    <>
      <nav
        aria-label="Administration primary navigation"
        className="ssc-bottom-nav flex w-full items-stretch border-t border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {PRIMARY.map(({ href, label: text, icon: Icon }) => {
          const active = isRouteActive(pathname, href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cell}>
              <div className={pill(active)}>
                <ShadecodeFeatureIcon icon={Icon} size="sm" tile={false} active={active} className={cn("h-5 w-5 transition-colors duration-200", active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} />
              </div>
              <span className={label(active)}>{text}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog" className={cell}>
          <div className={pill(moreActive || open)}>
            <Ellipsis className={cn("h-5 w-5 transition-colors duration-200", moreActive || open ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]")} aria-hidden="true" />
          </div>
          <span className={label(moreActive || open)}>More</span>
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="More admin tools">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <section className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-[24px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] shadow-[var(--shadow-lg)]">
            <ul className="grid grid-cols-2 gap-2">
              {more.map(({ href, label: text, icon: Icon }) => {
                const active = isRouteActive(pathname, href);
                return (
                  <li key={href}>
                    <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-12 items-center gap-3 rounded-2xl border px-3 text-sm transition", active ? "border-[var(--primary)] bg-[var(--primary-glow)] font-semibold" : "border-[var(--card-border)] hover:bg-[var(--surface-2)]")}>
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{text}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
