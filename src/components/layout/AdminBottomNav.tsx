"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ShadecodeFeatureIcon } from "@/components/brand/ShadecodeFeatureIcon";
import { ADMIN_NAV_GROUPS, isRouteActive } from "@/lib/navigation";

export function AdminBottomNav() {
  const pathname = usePathname();
  const items = ADMIN_NAV_GROUPS[0].items;

  return (
    <nav
      aria-label="Administration primary navigation"
      className="ssc-bottom-nav flex w-full items-stretch border-t border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = isRouteActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-[5px] px-1 pt-2 pb-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset"
          >
            <div
              className={cn(
                "relative flex h-[30px] w-10 items-center justify-center rounded-full transition-colors duration-200",
                active ? "bg-[var(--primary-glow)]" : "bg-transparent"
              )}
            >
              <ShadecodeFeatureIcon
                icon={Icon}
                size="sm"
                tile={false}
                active={active}
                className={cn(
                  "h-5 w-5 transition-colors duration-200",
                  active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
                )}
              />
            </div>
            <span
              className={cn(
                "max-w-full truncate text-[11px] leading-tight transition-colors duration-200",
                active ? "font-semibold text-[var(--primary)]" : "font-medium text-[var(--muted-foreground)]"
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
