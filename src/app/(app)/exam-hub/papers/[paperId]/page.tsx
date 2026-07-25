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
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreInput, setScoreInput] = useState("");
  const [scoreError, setScoreError] = useState<string | null>(null);

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

  function openScoreModal() {
    setScoreInput("");
    setScoreError(null);
    setShowScoreModal(true);
  }

  function skipScore() {
    setShowScoreModal(false);
    patchState({ status: "completed" });
  }

  function submitScore() {
    const trimmed = scoreInput.trim();
    if (trimmed === "") {
      skipScore();
      return;
    }
    const score = Number(trimmed);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      setScoreError("Enter a number between 0 and 100.");
      return;
    }
    setShowScoreModal(false);
    patchState({ status: "completed", score });
  }

  function handleDownload() {
    patchState({ downloaded_offline: true });
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", padding: 24 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ height: 28, width: "40%", borderRadius: 8, background: "var(--surface-2)", marginBottom: 20 }} />
          <div style={{ height: 600, borderRadius: 18, background: "var(--surface-2)" }} />
        </div>
      </div>
    );
  }

  if (error || !paper || !signedUrl) {
    return (
      <div style={{ minHeight: "100vh", padding: 24 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <button
            onClick={() => router.back()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", marginBottom: 20, fontSize: 13 }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div style={{ padding: 20, borderRadius: 18, background: "var(--danger-soft)", border: "1px solid color-mix(in srgb, var(--danger) 24%, transparent)" }}>
            <p style={{ color: "var(--danger)", margin: 0 }}>{error ?? "Paper not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
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
              accent="var(--warning)"
              disabled={saving}
            />
            <a href={signedUrl} download onClick={handleDownload} style={{ textDecoration: "none" }}>
              <ActionButton icon={Download} label="Download" onClick={() => {}} accent="var(--primary)" />
            </a>
            <ActionButton
              icon={CheckCircle2}
              label={paper.state?.status === "completed" ? "Completed" : "Mark complete"}
              onClick={paper.state?.status === "completed" ? () => {} : openScoreModal}
              active={paper.state?.status === "completed"}
              accent="var(--accent)"
              disabled={saving || paper.state?.status === "completed"}
            />
            <a href={signedUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <ActionButton icon={Maximize2} label="Full screen" onClick={() => {}} accent="var(--primary)" />
            </a>
          </div>
        </div>

        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid var(--card-border)",
            background: "var(--surface-3)",
            height: "80vh",
          }}
        >
          {/* Native browser PDF rendering — gives zoom, search, and full-screen
              for free with zero extra dependencies. Signed URL expires in
              10 minutes; the page re-fetches on reload. */}
          <iframe src={signedUrl} title="Past paper" style={{ width: "100%", height: "100%", border: "none" }} />
        </div>
      </div>

      {showScoreModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowScoreModal(false); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
          }}
        >
          <div
            style={{
              width: "100%", maxWidth: 380, borderRadius: 18, padding: 24,
              background: "var(--surface)", border: "1px solid var(--card-border)",
              boxShadow: "var(--shadow-lg, 0 20px 40px rgba(0,0,0,0.3))",
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)", margin: "0 0 6px" }}>
              How did it go?
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "0 0 18px" }}>
              Add your score to track weak and strong topics — or skip it.
            </p>

            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              autoFocus
              value={scoreInput}
              onChange={(e) => { setScoreInput(e.target.value); setScoreError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") submitScore(); }}
              placeholder="Score out of 100"
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12, marginBottom: scoreError ? 8 : 18,
                background: "var(--surface-2)", border: `1px solid ${scoreError ? "var(--danger)" : "var(--card-border)"}`,
                color: "var(--foreground)", fontSize: 15, boxSizing: "border-box",
              }}
            />
            {scoreError && (
              <p style={{ fontSize: 12, color: "var(--danger)", margin: "0 0 14px" }}>{scoreError}</p>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={skipScore}
                style={{
                  flex: 1, padding: "11px 0", borderRadius: 10, background: "var(--surface-2)",
                  border: "1px solid var(--card-border)", color: "var(--foreground)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Skip
              </button>
              <button
                onClick={submitScore}
                style={{
                  flex: 1, padding: "11px 0", borderRadius: 10, background: "var(--primary)",
                  border: "none", color: "var(--primary-foreground)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
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
        background: active ? `color-mix(in srgb, ${accent} 14%, transparent)` : "var(--surface-2)",
        border: `1px solid ${active ? `color-mix(in srgb, ${accent} 34%, transparent)` : "var(--card-border)"}`,
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
