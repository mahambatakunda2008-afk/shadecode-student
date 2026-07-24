"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, FileText, Inbox } from "lucide-react";

interface Submission {
  id: string;
  contributor_id: string;
  upload_type: string;
  syllabus_id: string;
  level: string;
  session: string;
  year: number;
  paper_number: number;
  variant: number;
  kind: string;
  created_at: string;
  previewUrl: string | null;
  syllabi: { subject: string; board: string } | null;
}

export default function ModerationQueuePage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/exam-hub/community")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSubmissions(data.submissions ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load queue"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    setActingOn(id);
    try {
      const res = await fetch(`/api/admin/exam-hub/community/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Approval failed");
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setActingOn(null);
    }
  }

  async function reject(id: string) {
    const notes = window.prompt("Reason for rejecting (shown to the contributor):") ?? "";
    setActingOn(id);
    try {
      const res = await fetch(`/api/admin/exam-hub/community/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rejection failed");
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
          Moderation Queue
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>
          {submissions.length} pending submission{submissions.length === 1 ? "" : "s"}
        </p>

        {error && (
          <div style={{ padding: 16, borderRadius: 14, background: "var(--danger-soft)", border: "1px solid color-mix(in srgb, var(--danger) 24%, transparent)", marginBottom: 20 }}>
            <p style={{ color: "var(--danger)", margin: 0, fontSize: 13 }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(2)].map((_, i) => <div key={i} style={{ height: 100, borderRadius: 14, background: "var(--surface-2)" }} />)}
          </div>
        ) : submissions.length === 0 ? (
          <div style={{ padding: 40, borderRadius: 18, background: "var(--surface-2)", border: "1px solid var(--card-border)", textAlign: "center" }}>
            <Inbox size={32} color="var(--muted-foreground)" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, color: "var(--muted-foreground)", margin: 0 }}>Nothing pending review.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {submissions.map((s) => (
              <div key={s.id} style={{ padding: 18, borderRadius: 16, background: "var(--surface-2)", border: "1px solid var(--card-border)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>
                      {s.syllabi?.subject ?? s.syllabus_id} ({s.syllabi?.board ?? "?"}) — {s.level}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                      {s.session} {s.year} · Paper {s.paper_number}/{s.variant} · {s.upload_type.replace("_", " ")}
                    </div>
                  </div>
                  {s.previewUrl && (
                    <a
                      href={s.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "var(--surface)", border: "1px solid var(--card-border)", color: "var(--foreground)", fontSize: 12, fontWeight: 500, textDecoration: "none" }}
                    >
                      <FileText size={13} /> Preview
                    </a>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button
                    onClick={() => approve(s.id)}
                    disabled={actingOn === s.id}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "var(--accent-soft)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: actingOn ? "default" : "pointer" }}
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    onClick={() => reject(s.id)}
                    disabled={actingOn === s.id}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "var(--danger-soft)", border: "1px solid color-mix(in srgb, var(--danger) 30%, transparent)", color: "var(--danger)", fontSize: 12, fontWeight: 600, cursor: actingOn ? "default" : "pointer" }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
