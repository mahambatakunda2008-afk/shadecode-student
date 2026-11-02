// src/app/results/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { PublicResultCard } from "@/components/share/PublicResultCard";
import { getPublicResult } from "@/lib/share/getPublicResult";
import { resultDescription, resultTitle } from "@/lib/share/publicResult";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicResult(id);
  if (!result) return { title: "Result not found — Shadecode Student", robots: { index: false, follow: false } };

  const title = `${resultTitle(result)} — Shadecode Student`;
  const description = resultDescription(result);
  return {
    title,
    description,
    // Unlisted by design: reachable by link, never indexed.
    robots: { index: false, follow: false },
    openGraph: { title, description, url: `/results/${id}`, siteName: "Shadecode Student", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ResultPage({ params }: Props) {
  const { id } = await params;
  const result = await getPublicResult(id);
  if (!result) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-[var(--foreground)]">
        <BrandMark className="h-6 w-6" aria-hidden="true" />
        <span className="text-lg font-bold tracking-tight">Shadecode Student</span>
      </Link>
      <PublicResultCard result={result} sharePath={`/results/${id}`} />
      <p className="mt-8 max-w-xs text-center text-xs text-[var(--muted-foreground)]">
        Free exam practice with instant marking. Your own results stay private unless you share the link.
      </p>
    </main>
  );
}
