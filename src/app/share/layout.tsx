"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--background)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold hover:text-[var(--primary)]"><Home size={17} /> Shadecode Student</Link>
          <div className="flex items-center gap-2"><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--surface-2)]"><ArrowLeft size={15} /> Back to app</Link></div>
        </div>
      </header>
      {children}
    </div>
  );
}
