"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_GROUPS, isRouteActive } from "@/lib/navigation";

export function AdminBottomNav() {
  const pathname = usePathname();
  const items = ADMIN_NAV_GROUPS[0].items;

  return (
    <nav
      className="flex w-full items-stretch border-t border-[var(--card-border)] bg-[var(--surface)]/95 shadow-[var(--shadow-lg)] backdrop-blur-2xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = isRouteActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center justify-center gap-[5px] pt-[10px] pb-[9px]"
          >
            <div
              className={cn(
                "relative w-10 h-[26px] rounded-full flex items-center justify-center transition-all duration-200",
                active ? "bg-[var(--primary-glow)]" : "bg-transparent"
              )}
            >
              <Icon
                className={cn(
                  "w-[20px] h-[20px] transition-all duration-200",
                  active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
                )}
                strokeWidth={active ? 2.2 : 1.8}
              />
            </div>
            <span
              className={cn(
                "text-[10px] leading-none transition-colors duration-200",
                active ? "text-[var(--primary)] font-semibold" : "text-[var(--muted-foreground)] font-medium"
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
