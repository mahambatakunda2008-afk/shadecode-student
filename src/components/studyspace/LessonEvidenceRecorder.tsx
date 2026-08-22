"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getWorkObject } from "@/lib/studyspace/store";
import { recordLessonEvidence } from "@/lib/studyspace/lessonEvidence";
import { downloadManager } from "@/lib/offline/downloadManager";

export default function LessonEvidenceRecorder() {
  const pathname = usePathname();

  useEffect(() => {
    const match = pathname.match(/^\/learn\/([^/]+)$/);
    if (!match) return;
    let lessonId: string;
    try { lessonId = decodeURIComponent(match[1]); } catch { return; }
    let cancelled = false;

    const captureCompletedLesson = async (progress: number, subject?: string, topic?: string, updatedAt?: string) => {
      if (cancelled) return;
      try {
        await recordLessonEvidence({ lessonId, subject, topic, progress, createdAt: updatedAt });
      } catch {
        // Evidence capture is best-effort and must never block learning.
      }
    };

    const handleCompleteClick = async (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("button") : null;
      const label = target?.getAttribute("aria-label") ?? "";
      if (!label.startsWith("Mark lesson as complete")) return;

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) return;

        await downloadManager.saveOfflineProgress(lessonId, session.user.id, true, 100);

        const response = await fetch(`/api/learn?lessonId=${encodeURIComponent(lessonId)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.ok || cancelled) {
          await captureCompletedLesson(100);
          return;
        }

        const data = await response.json() as { lesson?: { subject?: string; title?: string; updated_at?: string } };
        await captureCompletedLesson(100, data.lesson?.subject, data.lesson?.title, data.lesson?.updated_at);
      } catch {
        // The local progress record is already the durable fallback.
      }
    };

    document.addEventListener("click", handleCompleteClick, true);

    (async () => {
      try {
        const existing = await getWorkObject(`lesson:${lessonId}`);
        if (existing?.status === "submitted") return;

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || cancelled) return;

        const response = await fetch(`/api/learn?lessonId=${encodeURIComponent(lessonId)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!response.ok || cancelled) return;

        const data = await response.json() as { lesson?: { id: string; subject?: string; title?: string; progress?: number; updated_at?: string } };
        const lesson = data.lesson;
        if (!lesson || lesson.progress !== 100 || cancelled) return;

        await captureCompletedLesson(100, lesson.subject, lesson.title, lesson.updated_at);
      } catch {
        // Evidence capture is best-effort and must never block lesson viewing.
      }
    })();

    return () => {
      cancelled = true;
      document.removeEventListener("click", handleCompleteClick, true);
    };
  }, [pathname]);

  return null;
}
