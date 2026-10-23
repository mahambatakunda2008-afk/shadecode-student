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
    return <main className="mx-auto max-w-xl p-6"><h1 className="text-xl font-bold">Sign in required</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Sign in to access your learning workspace.</p></main>;
  }

  const learner = await resolveLearnerSubjects(supabase, user.id);
  if (!hasComputerScienceCurriculum(learner.subjects)) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-6">
          <h1 className="text-xl font-bold">Comp Lab is not enabled for your subjects</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Comp Lab is available to learners whose selected subjects include Computer Science, Computing Studies, or an equivalent recognized computing subject. Update your selected subjects if your course has changed.</p>
          <a href="/profile" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]">Review my profile</a>
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
