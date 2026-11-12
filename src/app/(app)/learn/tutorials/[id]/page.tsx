"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TutorialArticle, type Tutorial, type TutorialBlock } from "@/components/learn/TeacherTutorials";
import { offlineStorage } from "@/lib/offline/storage";

export default function TeacherTutorialPage() {
  const { id } = useParams<{ id: string }>();
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const response = await fetch(`/api/learn/tutorials/${encodeURIComponent(id)}`, { cache: "no-store" });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "This tutorial could not be opened.");
        if (active) setTutorial(body.tutorial as Tutorial);
      } catch (e) {
        // Tutorials opened before are kept for offline study.
        try {
          const cached = await offlineStorage.getLesson(`teacher-tutorial:${id}`);
          if (cached && active) {
            setTutorial({ id, title: cached.title, subject: cached.subject, topic: null, summary: cached.description ?? null, published_at: cached.downloadedAt, version: 0, blocks: (cached.blocks ?? []) as unknown as TutorialBlock[] });
            return;
          }
        } catch { /* fall through to the error */ }
        if (active) setError(e instanceof Error ? e.message : "This tutorial could not be opened.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
      <Link href="/learn/tutorials" className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={14} />All teacher tutorials
      </Link>
      {loading && <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]"><Loader2 size={16} className="animate-spin" />Opening tutorial…</p>}
      {error && !tutorial && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
      {tutorial && <TutorialArticle tutorial={tutorial} headingLevel={1} />}
    </div>
  );
}
