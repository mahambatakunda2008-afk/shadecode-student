"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; exact: boolean; adminOnly: boolean; reviewerOnly: boolean }[] = [
  { href: "/teacher", label: "Home", exact: true, adminOnly: false, reviewerOnly: false },
  { href: "/teacher/classes", label: "Classes", exact: false, adminOnly: false, reviewerOnly: false },
  { href: "/teacher/assignments", label: "Classwork", exact: false, adminOnly: false, reviewerOnly: false },
  { href: "/teacher/tutorials", label: "Tutorials", exact: false, adminOnly: false, reviewerOnly: true },
  { href: "/teacher/review", label: "Review", exact: false, adminOnly: false, reviewerOnly: true },
  { href: "/teacher/invites", label: "Invites", exact: false, adminOnly: true, reviewerOnly: false },
];

export function TeacherNav({ isAdmin, canReviewContent }: { isAdmin: boolean; canReviewContent: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-3 pb-2 sm:px-6" aria-label="Teacher workspace">
      {ITEMS.filter((i) => (!i.adminOnly || isAdmin) && (!i.reviewerOnly || canReviewContent)).map((item) => {
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
