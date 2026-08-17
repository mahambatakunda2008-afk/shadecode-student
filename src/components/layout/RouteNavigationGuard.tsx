"use client";

import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { usePathname } from "next/navigation";

const MANAGED_PREFIXES = ["/dashboard", "/focus", "/tasks", "/exams", "/exam-hub", "/exam-sim", "/learn", "/curriculum", "/math-checker", "/math-cortex", "/cortex-verify", "/timetable", "/study-plan", "/analytics", "/leaderboard", "/insights", "/study", "/achievements", "/settings", "/admin", "/share", "/onboarding", "/auth"];

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
