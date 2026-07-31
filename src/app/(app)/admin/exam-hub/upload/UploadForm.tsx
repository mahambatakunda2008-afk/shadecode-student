"use client";

import { useState, useMemo } from "react";
import { UploadCloud, CheckCircle2, XCircle } from "lucide-react";
import { SESSIONS_BY_BOARD } from "@/lib/exam-hub/types";

interface Props {
  syllabi: { id: string; subject: string; board: string; levels: string[] }[];
}

const KINDS: { value: string; label: string }[] = [
  { value: "qp", label: "Question Paper" },
  { value: "ms", label: "Mark Scheme" },
  { value: "in", label: "Insert" },
  { value: "gt", label: "Grade Thresholds" },
];

export default function UploadForm({ syllabi }: Props) {
  // Nothing pre-selected — a silently-defaulted subject/level/session is
  // exactly how papers end up mistagged. Every field starts blank.
  //
  // Order is Board -> Level -> Subject (not Board -> Subject -> Level).
  // Many subjects exist twice under the same board with the *same name*
  // but different levels (e.g. Physics is both an IGCSE syllabus and a
  // separate AS/A Level syllabus) — picking level first means the subject
  // dropdown is always scoped to one level, so the duplicate never shows
  // up in the same list at all.
  const [board, setBoard] = useState("");
  const [level, setLevel] = useState("");
  const [syllabusId, setSyllabusId] = useState("");
  const selectedSyllabus = useMemo(() => syllabi.find((s) => s.id === syllabusId), [syllabi, syllabusId]);

  const boards = useMemo(() => [...new Set(syllabi.map((s) => s.board))].sort(), [syllabi]);
  const levelOptions = useMemo(
    () => (board ? [...new Set(syllabi.filter((s) => s.board === board).flatMap((s) => s.levels))].sort() : []),
    [syllabi, board]
  );
  const subjectOptions = useMemo(
    () => (board && level ? syllabi.filter((s) => s.board === board && s.levels.includes(level)) : []),
    [syllabi, board, level]
  );
  const sessionOptions = board ? SESSIONS_BY_BOARD[board] ?? [] : [];

  const [session, setSession] = useState("");
  const [year, setYear] = useState("");
  const [paperNumber, setPaperNumber] = useState("");
  const [variant, setVariant] = useState("");
  const [kind, setKind] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleBoardChange(b: string) {
    setBoard(b);
    setLevel("");
    setSyllabusId("");
    setSession("");
  }

  function handleLevelChange(l: string) {
    setLevel(l);
    setSyllabusId("");
  }

  const isComplete =
    syllabusId !== "" &&
    level !== "" &&
    session !== "" &&
    year.trim() !== "" &&
    paperNumber.trim() !== "" &&
    variant.trim() !== "" &&
    kind !== "" &&
    file !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete || !file) {
      setResult({ ok: false, message: "Fill in every field before uploading." });
      return;
    }

    setSubmitting(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("syllabusId", syllabusId);
    formData.append("level", level);
    formData.append("session", session);
    formData.append("year", year);
    formData.append("paperNumber", paperNumber);
    formData.append("variant", variant);
    formData.append("kind", kind);

    try {
      const res = await fetch("/api/admin/exam-hub/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setResult({ ok: true, message: `Uploaded: Paper ${paperNumber}/${variant} (${kind.toUpperCase()})` });
      setBoard("");
      setLevel("");
      setSyllabusId("");
      setSession("");
      setYear("");
      setPaperNumber("");
      setVariant("");
      setKind("");
      setFile(null);
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24 }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", marginBottom: 4 }}>
          Upload Past Paper
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 24 }}>
          Admin only. One file at a time — for bulk uploads use the ingestion script in{" "}
          <code>bin/exam-hub-ingest/</code>.
        </p>

        {syllabi.length === 0 && (
          <div style={{ padding: 16, borderRadius: 14, background: "var(--warning-soft)", border: "1px solid color-mix(in srgb, var(--warning) 24%, transparent)", marginBottom: 20 }}>
            <p style={{ color: "var(--warning)", margin: 0, fontSize: 13 }}>
              No syllabi found. Add a row to the <code>syllabi</code> table before uploading papers.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Row>
            <Field label="Board">
              <select value={board} onChange={(e) => handleBoardChange(e.target.value)} style={selectStyle}>
                <option value="" disabled>Select a board…</option>
                {boards.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Level">
              <select value={level} onChange={(e) => handleLevelChange(e.target.value)} style={selectStyle} disabled={!board}>
                <option value="" disabled>{board ? "Select a level…" : "Pick a board first"}</option>
                {levelOptions.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </Row>

          <Field label="Subject">
            <select value={syllabusId} onChange={(e) => setSyllabusId(e.target.value)} style={selectStyle} disabled={!level}>
              <option value="" disabled>{level ? "Select a subject…" : "Pick a level first"}</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.subject}</option>
              ))}
            </select>
          </Field>

          <Row>
            <Field label="Session">
              <select value={session} onChange={(e) => setSession(e.target.value)} style={selectStyle} disabled={!board}>
                <option value="" disabled>{board ? "Select a session…" : "Pick a board first"}</option>
                {sessionOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Document type">
              <select value={kind} onChange={(e) => setKind(e.target.value)} style={selectStyle}>
                <option value="" disabled>Select…</option>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="Year">
              <input type="number" placeholder="e.g. 2025" value={year} onChange={(e) => setYear(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Paper #">
              <input type="number" min={1} placeholder="e.g. 2" value={paperNumber} onChange={(e) => setPaperNumber(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Variant">
              <input type="number" min={1} placeholder="e.g. 1" value={variant} onChange={(e) => setVariant(e.target.value)} style={inputStyle} />
            </Field>
          </Row>

          <Field label="PDF file">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: 20,
                borderRadius: 14,
                border: "1px dashed var(--card-border)",
                background: "var(--surface-2)",
                cursor: "pointer",
                color: file ? "var(--foreground)" : "var(--muted-foreground)",
                fontSize: 13,
              }}
            >
              <UploadCloud size={16} />
              {file ? file.name : "Choose a PDF"}
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ display: "none" }}
              />
            </label>
          </Field>

          <button
            type="submit"
            disabled={submitting || !isComplete}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: submitting || !isComplete ? "default" : "pointer",
              opacity: submitting || !isComplete ? 0.5 : 1,
            }}
          >
            {submitting ? "Uploading..." : "Upload"}
          </button>

          {result && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 14,
                borderRadius: 12,
                background: result.ok ? "var(--accent-soft)" : "var(--danger-soft)",
                border: `1px solid color-mix(in srgb, ${result.ok ? "var(--accent)" : "var(--danger)"} 24%, transparent)`,
              }}
            >
              {result.ok ? <CheckCircle2 size={16} color="var(--accent)" /> : <XCircle size={16} color="var(--danger)" />}
              <span style={{ fontSize: 13, color: result.ok ? "var(--accent)" : "var(--danger)" }}>{result.message}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <label style={{ display: "block", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12 }}>{children}</div>;
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  background: "var(--surface-2)",
  border: "1px solid var(--card-border)",
  color: "var(--foreground)",
  fontSize: 13,
};

const inputStyle: React.CSSProperties = { ...selectStyle };
