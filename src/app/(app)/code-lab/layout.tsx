"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { hasComputerScienceCurriculum } from "@/lib/academic/code-lab";

export default function CodeLabLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, loading } = useUser();
  const eligible = hasComputerScienceCurriculum(profile?.curriculum_subjects);

  useEffect(() => {
    if (!loading && !eligible && pathname.startsWith("/code-lab")) {
      router.replace("/learn");
    }
  }, [eligible, loading, pathname, router]);

  if (loading || !eligible) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-5 py-10">
        <div className="w-full rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Code Lab is for Computer Science learners</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Code Lab appears when Computer Science is part of your academic subjects.</p>
        </div>
      </main>
    );
  }

  return children;
}
