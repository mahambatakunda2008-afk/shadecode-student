"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/navigation";

// Keep every first-party app module inside the app shell. This guard is only for
// genuinely public/unmanaged routes, so adding a module to navigation cannot
// accidentally make it render with the public-site navigation chrome.
const NAV_MANAGED_PREFIXES = Object.values(NAV_ITEMS).map((item) => item.href);
const EXTRA_APP_PREFIXES = [
  "/math-checker",
  "/math-cortex",
  "/cortex-verify",
  "/code-lab",
  "/careers",
  "/daily-challenge",
  "/onboarding",
  "/auth",
  "/admin",
];

const MANAGED_PREFIXES = Array.from(new Set([...NAV_MANAGED_PREFIXES, ...EXTRA_APP_PREFIXES]));

export function RouteNavigationGuard() {
  const pathname = usePathname();
  if (MANAGED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;

  return (
    <nav aria-label="Page navigation" className="sticky top-0 z-50 border-b border-[var(--card-border)] bg-[var(--background)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold hover:text-[var(--primary)]"><Home size={15} /> Shadecode Student</Link>
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--surface-2)]"><ArrowLeft size={14} /> Back to app</Link>
      </div>
    </nav>
  );
}
