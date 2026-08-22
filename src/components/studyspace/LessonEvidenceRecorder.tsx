"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getWorkObject } from "@/lib/studyspace/store";
import { recordLessonEvidence } from "@/lib/studyspace/lessonEvidence";

export default function LessonEvidenceRecorder() {
  const pathname = usePathname();

  useEffect(() => {
    const match = pathname.match(/^\/learn\/([^/]+)$/);
    if (!match) return;
    const lessonId = decodeURIComponent(match[1]);
    let cancelled = false;

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

        await recordLessonEvidence({
          lessonId: lesson.id,
          subject: lesson.subject,
          topic: lesson.title,
          progress: 100,
          createdAt: lesson.updated_at,
        });
      } catch {
        // Evidence capture is best-effort and must never block lesson viewing.
      }
    })();

    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}
