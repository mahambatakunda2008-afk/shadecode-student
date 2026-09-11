"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { hasComputerScienceCurriculum } from "@/lib/academic/code-lab";

export default function CodeLabLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useUser();
  const hasProfile = Boolean(profile);
  const eligible = hasComputerScienceCurriculum(profile?.curriculum_subjects);

  useEffect(() => {
    if (hasProfile && !eligible && pathname.startsWith("/code-lab")) {
      router.replace("/learn");
    }
  }, [eligible, hasProfile, pathname, router]);

  if (!hasProfile) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-5 py-10">
        <div className="w-full rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-6 text-center shadow-sm">
          <p className="text-sm text-[var(--muted-foreground)]">Loading your academic profile…</p>
        </div>
      </main>
    );
  }

  if (!eligible) return null;
  return children;
}
