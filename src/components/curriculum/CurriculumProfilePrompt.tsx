"use client";

import { useEffect, useState } from "react";
import { ArrowRight, GraduationCap, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function CurriculumProfilePrompt() {
  const pathname = usePathname();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname === "/settings" || pathname === "/onboarding" || pathname.startsWith("/admin")) return;
    let cancelled = false;
    fetch("/api/curriculum/profile", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!cancelled) setVisible(Array.isArray(data?.curriculumSubjects) && data.curriculumSubjects.length === 0);
      })
      .catch(() => { if (!cancelled) setVisible(false); });
    return () => { cancelled = true; };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="sticky top-0 z-[80] border-b border-[var(--card-border)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)] sm:flex">
          <GraduationCap size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">Tell Shadecode what you're studying</p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">Your exam board, qualification, syllabus and subject help Learn, exams and Cortex stay accurate.</p>
        </div>
        <button type="button" onClick={() => router.push("/settings")} className="ssc-button shrink-0 px-3 py-2 text-xs sm:text-sm">
          Set curriculum <ArrowRight size={15} />
        </button>
        <button type="button" onClick={() => setVisible(false)} aria-label="Dismiss curriculum reminder" className="rounded-xl p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
