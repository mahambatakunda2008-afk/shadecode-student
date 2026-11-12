"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/teacher", label: "Home", exact: true, adminOnly: false },
  { href: "/teacher/tutorials", label: "Tutorials", exact: false, adminOnly: false },
  { href: "/teacher/review", label: "Review", exact: false, adminOnly: false },
  { href: "/teacher/invites", label: "Invites", exact: false, adminOnly: true },
];

export function TeacherNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex w-full max-w-3xl gap-1 overflow-x-auto px-3 pb-2" aria-label="Teacher portal">
      {ITEMS.filter((i) => isAdmin || !i.adminOnly).map((item) => {
        const inTutorialReview = pathname.startsWith("/teacher/tutorials/review");
        const active = item.exact
          ? pathname === item.href
          : item.href === "/teacher/review"
            ? pathname.startsWith("/teacher/review") || inTutorialReview
            : item.href === "/teacher/tutorials"
              ? pathname.startsWith("/teacher/tutorials") && !inTutorialReview
              : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-xl px-3 py-2 text-sm transition",
              active ? "bg-[var(--primary-glow)] font-semibold text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
