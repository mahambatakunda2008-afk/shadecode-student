"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Clock, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { SESSIONS_BY_BOARD, type Syllabus } from "@/lib/exam-hub/types";

const LEVELS_BY_BOARD: Record<string, string[]> = {
  CAIE: ["IGCSE", "AS Level", "A Level"],
  ZIMSEC: ["O-Level", "A-Level"],
};

const UPLOAD_TYPES = [
  { value: "paper", label: "Question Paper" },
  { value: "mark_scheme", label: "Mark Scheme" },
  { value: "examiner_report", label: "Examiner Report" },
  { value: "variant", label: "Missing Variant" },
];

const KIND_BY_UPLOAD_TYPE: Record<string, string> = {
  paper: "qp",
  mark_scheme: "ms",
  examiner_report: "gt",
  variant: "qp",
};

interface Submission {
  id: string;
  upload_type: string;
  syllabus_id: string;
  level: string;
  session: string;
  year: number;
  paper_number: number;
  variant: number;
  status: "pending" | "approved" | "rejected";
  moderator_notes: string | null;
  xp_awarded: boolean;
  created_at: string;
}

export default function ContributePage() {
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  const [board, setBoard] = useState("CAIE");
  const [syllabusId, setSyllabusId] = useState("");
  const [level, setLevel] = useState(LEVELS_BY_BOARD.CAIE[0]);
  const [session, setSession] = useState(SESSIONS_BY_BOARD.CAIE[0]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [paperNumber, setPaperNumber] = useState(1);
  const [variant, setVariant] = useState(1);
  const [uploadType, setUploadType] = useState("paper");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const loadSubmissions = useCallback(() => {
    setLoadingSubmissions(true);
    fetch("/api/exam-hub/community/mine")
      .then((res) => res.json())
      .then((data) => setSubmissions(data.submissions ?? []))
      .finally(() => setLoadingSubmissions(false));
  }, []);

  useEffect(() => {
    fetch("/api/exam-hub/syllabi")
      .then((res) => res.json())
      .then((data) => {
        const list: Syllabus[] = data.syllabi ?? [];
        setSyllabi(list);
        const first = list.find((s) => s.board === "CAIE");
        if (first) setSyllabusId(first.id);
      });
    loadSubmissions();
  }, [loadSubmissions]);

  const boards = [...new Set(syllabi.map((s) => s.board))].sort();
  const subjectsForBoard = syllabi.filter((s) => s.board === board);

  function handleBoardChange(b: string) {
    setBoard(b);
    setLevel(LEVELS_BY_BOARD[b]?.[0] ?? "");
    setSession(SESSIONS_BY_BOARD[b]?.[0] ?? "");
    const first = syllabi.find((s) => s.board === b);
    setSyllabusId(first?.id ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setResult({ ok: false, message: "Choose a PDF file first." });
      return;
    }

    setSubmitting(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploadType", uploadType);
    formData.append("syllabusId", syllabusId);
    formData.append("level", level);
    formData.append("session", session);
    formData.append("year", String(year));
    formData.append("paperNumber", String(paperNumber));
    formData.append("variant", String(variant));
    formData.append("kind", KIND_BY_UPLOAD_TYPE[uploadType] ?? "qp");

    try {
      const res = await fetch("/api/exam-hub/community/submit", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setResult({ ok: true, message: "Submitted for review. You'll earn XP once it's approved." });
      setFile(null);
      loadSubmissions();
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Submission failed" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link
          href="/exam-hub"
          style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted-foreground)", textDecoration: "none", marginBottom: 16, fontSize: 13, width: "fit-content" }}
        >
          <ArrowLeft size={16} /> Exam Hub
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <Sparkles size={20} color="var(--warning)" />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            Contribute a Paper
          </h1>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>
          Have a paper, mark scheme, or examiner report others are missing? Submit it — every
          approved contribution earns you XP. Nothing goes public until it&apos;s reviewed.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 36 }}>
          <Field label="What are you contributing?">
            <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} style={selectStyle}>
              {UPLOAD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          <Row>
            <Field label="Board">
              <select value={board} onChange={(e) => handleBoardChange(e.target.value)} style={selectStyle}>
                {boards.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Subject">
              <select value={syllabusId} onChange={(e) => setSyllabusId(e.target.value)} style={selectStyle}>
                {subjectsForBoard.map((s) => <option key={s.id} value={s.id}>{s.subject}</option>)}
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="Level">
              <select value={level} onChange={(e) => setLevel(e.target.value)} style={selectStyle}>
                {(LEVELS_BY_BOARD[board] ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Session">
              <select value={session} onChange={(e) => setSession(e.target.value)} style={selectStyle}>
                {(SESSIONS_BY_BOARD[board] ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="Year">
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectStyle} />
            </Field>
            <Field label="Paper #">
              <input type="number" min={1} value={paperNumber} onChange={(e) => setPaperNumber(Number(e.target.value))} style={selectStyle} />
            </Field>
            <Field label="Variant">
              <input type="number" min={1} value={variant} onChange={(e) => setVariant(Number(e.target.value))} style={selectStyle} />
            </Field>
          </Row>

          <Field label="PDF file (max 25MB)">
            <label
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: 20, borderRadius: 14, border: "1px dashed var(--card-border)",
                background: "var(--surface-2)", cursor: "pointer",
                color: file ? "var(--foreground)" : "var(--muted-foreground)", fontSize: 13,
              }}
            >
              <UploadCloud size={16} />
              {file ? file.name : "Choose a PDF"}
              <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
            </label>
          </Field>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "12px 20px", borderRadius: 12, background: "var(--primary)", color: "var(--primary-foreground)",
              fontSize: 14, fontWeight: 600, border: "none", cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Submitting..." : "Submit for review"}
          </button>

          {result && (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: 14, borderRadius: 12,
                background: result.ok ? "var(--accent-soft)" : "var(--danger-soft)",
                border: `1px solid color-mix(in srgb, ${result.ok ? "var(--accent)" : "var(--danger)"} 24%, transparent)`,
              }}
            >
              {result.ok ? <CheckCircle2 size={16} color="var(--accent)" /> : <XCircle size={16} color="var(--danger)" />}
              <span style={{ fontSize: 13, color: result.ok ? "var(--accent)" : "var(--danger)" }}>{result.message}</span>
            </div>
          )}
        </form>

        <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--foreground)", marginBottom: 12 }}>
          Your submissions
        </h2>
        {loadingSubmissions ? (
          <div style={{ height: 60, borderRadius: 14, background: "var(--surface-2)" }} />
        ) : submissions.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Nothing submitted yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {submissions.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  padding: 14, borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--card-border)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>
                    {s.syllabus_id} — Paper {s.paper_number}/{s.variant}, {s.session} {s.year}
                  </div>
                  {s.status === "rejected" && s.moderator_notes && (
                    <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 2 }}>{s.moderator_notes}</div>
                  )}
                </div>
                <StatusBadge status={s.status} xpAwarded={s.xp_awarded} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, xpAwarded }: { status: string; xpAwarded: boolean }) {
  const config = {
    pending: { icon: Clock, color: "var(--warning)", label: "Pending review" },
    approved: { icon: CheckCircle2, color: "var(--accent)", label: xpAwarded ? "Approved · +50 XP" : "Approved" },
    rejected: { icon: XCircle, color: "var(--danger)", label: "Not approved" },
  }[status] ?? { icon: Clock, color: "var(--muted-foreground)", label: status };

  const Icon = config.icon;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
      <Icon size={14} color={config.color} />
      <span style={{ fontSize: 12, fontWeight: 600, color: config.color }}>{config.label}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12 }}>{children}</div>;
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  background: "var(--surface-2)", border: "1px solid var(--card-border)",
  color: "var(--foreground)", fontSize: 13,
};
