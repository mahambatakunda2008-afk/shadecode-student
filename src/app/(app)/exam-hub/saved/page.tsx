"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, FileText } from "lucide-react";
import type { PastPaperWithState } from "@/lib/exam-hub/types";
import { PAPER_KIND_LABELS } from "@/lib/exam-hub/types";

export default function SavedPapersPage() {
  const [papers, setPapers] = useState<PastPaperWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/exam-hub/saved")
      .then((res) => res.json())
      .then((data) => setPapers(data.papers ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load saved papers"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="ssc-page min-h-screen px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/exam-hub"
          style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", textDecoration: "none", marginBottom: 16, fontSize: 13, width: "fit-content" }}
        >
          <ArrowLeft size={16} /> Exam Hub
        </Link>

        <header className="ssc-page-header mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Bookmark size={19} /></div>
          <div><h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Saved papers</h1><p className="mt-1 text-sm text-[var(--muted-foreground)]">Your bookmarked papers, ready for another attempt.</p></div>
        </header>

        {error && (
          <div style={{ padding: 16, borderRadius: 14, background: "var(--danger-soft)", border: "1px solid color-mix(in srgb, var(--danger) 24%, transparent)", marginBottom: 20 }}>
            <p style={{ color: "var(--danger)", margin: 0, fontSize: 13 }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ height: 64, borderRadius: 14, background: "var(--surface-2)" }} />
            ))}
          </div>
        ) : papers.length === 0 ? (
          <div style={{ padding: 40, borderRadius: 18, background: "var(--surface-2)", border: "1px solid var(--card-border)", textAlign: "center" }}>
            <Bookmark size={32} color="var(--muted-foreground)" style={{ margin: "0 auto 12px" }} />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", marginBottom: 6 }}>
              Nothing saved yet
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 20px" }}>
              Bookmark papers while browsing and they&apos;ll show up here.
            </p>
            <Link
              href="/exam-hub/papers"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              Browse Past Papers
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {papers.map((p) => (
              <Link
                key={p.id}
                href={`/exam-hub/papers/${p.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 16,
                  borderRadius: 14,
                  background: "var(--surface-2)",
                  border: "1px solid var(--card-border)",
                  textDecoration: "none",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <FileText size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                      Paper {p.paper_number} / {p.variant} — {PAPER_KIND_LABELS[p.kind]}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                      {p.session} {p.year} · {p.level} · {p.syllabus_id}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
