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
  const [syllabusId, setSyllabusId] = useState(syllabi[0]?.id ?? "");
  const selectedSyllabus = useMemo(() => syllabi.find((s) => s.id === syllabusId), [syllabi, syllabusId]);

  const levelOptions = selectedSyllabus?.levels ?? [];
  const sessionOptions = selectedSyllabus ? SESSIONS_BY_BOARD[selectedSyllabus.board] ?? [] : [];

  const [level, setLevel] = useState(levelOptions[0] ?? "");
  const [session, setSession] = useState(sessionOptions[0] ?? "");
  const [year, setYear] = useState(new Date().getFullYear());
  const [paperNumber, setPaperNumber] = useState(1);
  const [variant, setVariant] = useState(1);
  const [kind, setKind] = useState("qp");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleSyllabusChange(newId: string) {
    setSyllabusId(newId);
    const next = syllabi.find((s) => s.id === newId);
    setLevel(next?.levels[0] ?? "");
    setSession(next ? SESSIONS_BY_BOARD[next.board]?.[0] ?? "" : "");
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
    formData.append("syllabusId", syllabusId);
    formData.append("level", level);
    formData.append("session", session);
    formData.append("year", String(year));
    formData.append("paperNumber", String(paperNumber));
    formData.append("variant", String(variant));
    formData.append("kind", kind);

    try {
      const res = await fetch("/api/admin/exam-hub/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setResult({ ok: true, message: `Uploaded: Paper ${paperNumber}/${variant} (${kind.toUpperCase()})` });
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
          <Field label="Subject / Syllabus">
            <select value={syllabusId} onChange={(e) => handleSyllabusChange(e.target.value)} style={selectStyle}>
              {[...new Set(syllabi.map((s) => s.board))].map((board) => (
                <optgroup key={board} label={board}>
                  {syllabi
                    .filter((s) => s.board === board)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <Row>
            <Field label="Level">
              <select value={level} onChange={(e) => setLevel(e.target.value)} style={selectStyle}>
                {levelOptions.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Session">
              <select value={session} onChange={(e) => setSession(e.target.value)} style={selectStyle}>
                {sessionOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="Year">
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Paper #">
              <input type="number" min={1} value={paperNumber} onChange={(e) => setPaperNumber(Number(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Variant">
              <input type="number" min={1} value={variant} onChange={(e) => setVariant(Number(e.target.value))} style={inputStyle} />
            </Field>
          </Row>

          <Field label="Document type">
            <select value={kind} onChange={(e) => setKind(e.target.value)} style={selectStyle}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </Field>

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
            disabled={submitting || syllabi.length === 0}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: submitting ? "default" : "pointer",
              opacity: submitting ? 0.7 : 1,
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
