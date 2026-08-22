"use client";

import { useSearchParams } from "next/navigation";
import { Target } from "lucide-react";

export default function AdaptiveLessonContext() {
  const params = useSearchParams();
  if (params.get("source") !== "adaptive") return null;

  const subject = params.get("subject")?.trim();
  const topic = params.get("topic")?.trim();
  if (!subject && !topic) return null;

  return (
    <div role="status" aria-label="Adaptive learning context" style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20, padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(139,92,246,0.28)", background: "rgba(139,92,246,0.08)" }}>
      <Target size={18} aria-hidden style={{ marginTop: 2 }} />
      <div>
        <strong style={{ display: "block", marginBottom: 3 }}>Targeted learning</strong>
        <span style={{ opacity: 0.78, fontSize: 13 }}>
          Recommended from your recent learning evidence{subject ? ` in ${subject}` : ""}{topic ? `, focused on ${topic}` : ""}.
        </span>
      </div>
    </div>
  );
}
