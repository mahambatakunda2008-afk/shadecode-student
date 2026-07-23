"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, BookmarkCheck, Download, CheckCircle2, Maximize2 } from "lucide-react";
import type { PastPaperWithState } from "@/lib/exam-hub/types";
import { PAPER_KIND_LABELS } from "@/lib/exam-hub/types";

export default function PaperViewerPage() {
  const params = useParams<{ paperId: string }>();
  const router = useRouter();

  const [paper, setPaper] = useState<PastPaperWithState | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/exam-hub/papers/${params.paperId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Paper not found");
        return res.json();
      })
      .then((data) => {
        setPaper(data.paper);
        setSignedUrl(data.signedUrl);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load paper"))
      .finally(() => setLoading(false));
  }, [params.paperId]);

  useEffect(() => {
    load();
  }, [load]);

  // Best-effort: mark in_progress the first time the paper is opened.
  useEffect(() => {
    if (paper && (!paper.state || paper.state.status === "not_started")) {
      patchState({ status: "in_progress" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper?.id]);

  async function patchState(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/exam-hub/papers/${params.paperId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setPaper((prev) => (prev ? { ...prev, state: data.state } : prev));
    } catch {
      // Non-critical — don't block the viewer over a state-save failure.
    } finally {
      setSaving(false);
    }
  }

  function toggleBookmark() {
    if (!paper) return;
    patchState({ bookmarked: !paper.state?.bookmarked });
  }

  function markComplete() {
    patchState({ status: "completed" });
  }

  function handleDownload() {
    patchState({ downloaded_offline: true });
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", padding: 24, background: "#0e0e18" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ height: 28, width: "40%", borderRadius: 8, background: "var(--surface-2)", marginBottom: 20 }} />
          <div style={{ height: 600, borderRadius: 18, background: "var(--surface-2)" }} />
        </div>
      </div>
    );
  }

  if (error || !paper || !signedUrl) {
    return (
      <div style={{ minHeight: "100vh", padding: 24, background: "#0e0e18" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <button
            onClick={() => router.back()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", marginBottom: 20, fontSize: 13 }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ padding: 20, borderRadius: 18, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p style={{ color: "#fca5a5", margin: 0 }}>{error ?? "Paper not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "#0e0e18" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <button
          onClick={() => router.back()}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", marginBottom: 16, fontSize: 13 }}
        >
          <ArrowLeft size={16} /> Back to papers
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
              Paper {paper.paper_number} / {paper.variant} — {PAPER_KIND_LABELS[paper.kind]}
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "4px 0 0" }}>
              {paper.session} {paper.year} · {paper.level}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ActionButton
              icon={paper.state?.bookmarked ? BookmarkCheck : Bookmark}
              label={paper.state?.bookmarked ? "Bookmarked" : "Bookmark"}
              onClick={toggleBookmark}
              active={paper.state?.bookmarked}
              accent="#f59e0b"
              disabled={saving}
            />
            <a href={signedUrl} download onClick={handleDownload} style={{ textDecoration: "none" }}>
              <ActionButton icon={Download} label="Download" onClick={() => {}} accent="#06b6d4" />
            </a>
            <ActionButton
              icon={CheckCircle2}
              label={paper.state?.status === "completed" ? "Completed" : "Mark complete"}
              onClick={markComplete}
              active={paper.state?.status === "completed"}
              accent="#22c55e"
              disabled={saving}
            />
            <a href={signedUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <ActionButton icon={Maximize2} label="Full screen" onClick={() => {}} accent="#8b5cf6" />
            </a>
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid var(--card-border)",
            background: "#1a1a24",
            height: "80vh",
          }}
        >
          {/* Native browser PDF rendering — gives zoom, search, and full-screen
              for free with zero extra dependencies. Signed URL expires in
              10 minutes; the page re-fetches on reload. */}
          <iframe src={signedUrl} title="Past paper" style={{ width: "100%", height: "100%", border: "none" }} />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active,
  accent,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  active?: boolean;
  accent: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 10,
        background: active ? `${accent}1a` : "var(--surface-2)",
        border: `1px solid ${active ? `${accent}55` : "var(--card-border)"}`,
        color: active ? accent : "var(--foreground)",
        fontSize: 12,
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Icon size={14} color={active ? accent : "var(--muted-foreground)"} />
      {label}
    </button>
  );
}
