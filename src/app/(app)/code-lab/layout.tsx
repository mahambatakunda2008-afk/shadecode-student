"use client";

import { useUser } from "@/contexts/UserContext";

export default function CodeLabLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useUser();

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-5 py-10">
        <div className="w-full rounded-3xl border border-[var(--card-border)] bg-[var(--surface)] p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-[var(--card-border)] border-t-[var(--primary)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">Opening Code Lab</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Preparing your learning workspace…</p>
        </div>
      </main>
    );
  }

  return children;
}
