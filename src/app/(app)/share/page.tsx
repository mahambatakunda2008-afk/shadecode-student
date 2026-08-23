"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard, Share2 } from "lucide-react";

export default function SharePage() {
  return (
    <main className="mx-auto w-full max-w-4xl p-5 sm:p-8">
      <nav aria-label="Page navigation" className="mb-6 flex items-center justify-between gap-3">
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-3 py-2 text-sm font-bold">
          <ArrowLeft size={16} /> Home
        </Link>
        <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[var(--muted-foreground)]">
          <LayoutDashboard size={16} /> Dashboard
        </Link>
      </nav>
      <section className="rounded-[2rem] border border-[var(--card-border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
        <div className="mb-4 inline-flex rounded-2xl bg-[var(--primary-glow)] p-3"><Share2 size={22} /></div>
        <h1 className="text-3xl font-black tracking-tight">Share</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
          Share your learning progress, achievements, and study work when you choose. Your private learning data remains private by default.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/analytics" className="rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-black text-white">View progress</Link>
          <Link href="/achievements" className="rounded-xl border border-[var(--card-border)] px-4 py-3 text-sm font-bold">Achievements</Link>
        </div>
      </section>
    </main>
  );
}
