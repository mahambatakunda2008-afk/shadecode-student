import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 text-[var(--foreground)]">
      <section className="flex max-w-md flex-col items-center text-center">
        <BrandMark className="mb-7 h-20 w-20 text-cyan-400" aria-hidden="true" />
        <p className="mb-2 text-sm font-medium uppercase tracking-[0.28em] text-cyan-400">Shadecode Student</p>
        <h1 className="font-brand text-3xl tracking-tight">Page not found</h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          That destination does not exist here. Head back to your workspace and keep learning.
        </p>
        <Link
          href="/"
          className="mt-7 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Back to Shadecode
        </Link>
      </section>
    </main>
  );
}
