import { Suspense } from "react";
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

export default function CompLabPage() {
  return (
    <Suspense fallback={<CompLabLoading />}>
      <CompLabWorkspace />
    </Suspense>
  );
}
