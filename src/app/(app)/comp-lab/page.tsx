import Link from "next/link";
import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";
import { hasComputerScienceCurriculum } from "@/lib/academic/code-lab";
import CompLabWorkspace from "@/components/comp-lab/CompLabWorkspace";

function CompLabLoading() {
  return (
    <main className="flex min-h-full w-full items-center justify-center bg-[var(--background)] p-6">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--muted-foreground)]">
        Opening Comp Lab…
      </div>
    </main>
  );
}

export default async function CompLabPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-bold">Sign in required</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Sign in to access your learning workspace.</p>
        <Link href="/auth/login" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]">Sign in</Link>
      </main>
    );
  }

  const learner = await resolveLearnerSubjects(supabase, user.id);

  // Eligibility must follow the canonical profile selection. The per-user
  // subject catalog can lag behind profile updates, so it must not lock out
  // a learner whose profile already contains a recognized computing subject.
  const { data: profile } = await supabase
    .from("profiles")
    .select("subjects")
    .eq("id", user.id)
    .maybeSingle();
  const profileSubjects = Array.isArray(profile?.subjects) ? profile.subjects : [];
  const hasComputingSubject =
    hasComputerScienceCurriculum(learner.subjects) ||
    hasComputerScienceCurriculum(profileSubjects);

  if (!hasComputingSubject) {
    return (
      <main className="min-h-full bg-[var(--background)] pb-6">
        <nav aria-label="Comp Lab navigation" className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b border-[var(--card-border)] bg-[var(--surface)]/95 px-3 backdrop-blur sm:px-5">
          <Link href="/dashboard" className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-[var(--card-border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)]">
            <span aria-hidden="true" className="mr-2">←</span><span>Back to Student</span>
          </Link>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--foreground)]">Comp Lab</span>
          <Link href="/settings" className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-[var(--primary)] px-3 text-sm font-semibold text-[var(--primary-foreground)]">
            Profile
          </Link>
        </nav>
        <section className="mx-auto w-full max-w-xl px-3 py-5 sm:px-6 sm:py-8">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 sm:p-6">
            <h1 className="text-xl font-bold">Comp Lab is not enabled for your subjects</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Comp Lab is available to learners whose selected subjects include Computer Science, Computing Studies, or an equivalent recognized computing subject. If Computer Science is already selected in your profile, your subject list may not have synchronized yet.</p>
            <Link href="/settings" className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] sm:w-auto">Review my profile</Link>
            <Link href="/dashboard" className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--card-border)] px-4 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] sm:ml-2 sm:mt-4 sm:w-auto">Return to Home</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <Suspense fallback={<CompLabLoading />}>
      <CompLabWorkspace />
    </Suspense>
  );
}
