"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface MathResult {
  problem: string;
  score: number;
  correct: boolean;
  cortexInsight: string;
  steps: { description: string; status: string; note?: string }[];
}

export default function MathCheckerPage() {
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<MathResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = (file: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImage(file);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const analyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("question", question);
      formData.append("subject", subject);
      formData.append("topic", subject);

      const res = await fetch("/api/math-checker", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || data.error) {
        // Surface the API's actual reason (unclear image, provider down,
        // too large, etc.) instead of a single generic message that hides
        // which stage failed.
        throw new Error(data.error || "Analysis failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyse the image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const cardStyle = {
    background: "var(--card)",
    border: "1px solid var(--card-border)",
    borderRadius: "12px",
    padding: "16px",
  };

  const inputStyle = {
    width: "100%",
    background: "var(--muted)",
    border: "1px solid var(--card-border)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "var(--foreground)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const primaryBtn = {
    background: "var(--primary)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "12px 16px",
    fontWeight: 700,
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 0 16px var(--primary-glow)",
    width: "100%",
  };

  const mutedBtn = {
    background: "var(--muted)",
    color: "var(--muted-foreground)",
    border: "none",
    borderRadius: "8px",
    padding: "12px 16px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    width: "100%",
  };

  return (
    <div style={{ padding: "32px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div>
        <p style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>
          CORTEX
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>Math Checker</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
          Upload your working from any source — textbook, exam paper, or teacher — and Cortex reads every step
        </p>
      </div>

      {/* Input fields */}
      <div style={cardStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "4px" }}>
              Question <span style={{ opacity: 0.5 }}>(optional)</span>
            </p>
            <input
              placeholder="e.g. Solve x² + 5x + 6 = 0 by factorisation"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={inputStyle}
            />
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "4px", opacity: 0.6 }}>
              Leave blank and Cortex will infer the question from your working
            </p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "4px" }}>
              Subject <span style={{ opacity: 0.5 }}>(optional)</span>
            </p>
            <input
              placeholder="e.g. Mathematics, Physics, Chemistry"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Upload */}
      <div style={cardStyle}>
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
          Your Working
        </p>

        {!preview ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "var(--primary)" : "var(--card-border)"}`,
              borderRadius: "10px",
              padding: "3rem 1rem",
              textAlign: "center",
              cursor: "pointer",
              background: dragging ? "rgba(99,102,241,0.05)" : "transparent",
              transition: "all 0.2s",
            }}
          >
            <p style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📐</p>
            <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginBottom: "4px" }}>
              Drop your photo here or click to upload
            </p>
            <p style={{ color: "var(--muted-foreground)", fontSize: "11px", opacity: 0.6 }}>
              JPG, PNG, HEIC supported
            </p>
          </div>
        ) : (
          <img
            src={preview}
            alt="Working"
            style={{ width: "100%", borderRadius: "8px", maxHeight: "320px", objectFit: "contain", background: "var(--muted)" }}
          />
        )}

        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {preview ? (
            <>
              <button onClick={analyze} disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}>
                {loading ? "🧠 Cortex is reading..." : "🧠 Analyse My Working"}
              </button>
              <button onClick={reset} style={mutedBtn}>Clear & try again</button>
            </>
          ) : (
            <button onClick={() => cameraInputRef.current?.click()} style={mutedBtn}>
              📷 Use Camera
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ ...cardStyle, border: "1px solid rgba(239,68,68,0.3)" }}>
          <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{
                width: "64px", height: "64px", borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.3rem", fontWeight: 700,
                background: result.score >= 80 ? "rgba(34,197,94,0.15)" : result.score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                color: result.score >= 80 ? "#22c55e" : result.score >= 50 ? "#f59e0b" : "var(--danger)",
                border: `2px solid ${result.score >= 80 ? "rgba(34,197,94,0.3)" : result.score >= 50 ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}>
                {result.score}%
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>{result.problem}</p>
                <span style={{
                  fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px",
                  background: result.correct ? "rgba(34,197,94,0.15)" : result.score > 40 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)",
                  color: result.correct ? "#22c55e" : result.score > 40 ? "#f59e0b" : "var(--danger)",
                }}>
                  {result.correct ? "Correct" : result.score > 40 ? "Partially correct" : "Needs work"}
                </span>
              </div>
            </div>

            <p style={{ fontSize: "11px", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "6px" }}>CORTEX</p>
            <p style={{
              fontSize: "13px", lineHeight: 1.7, color: "var(--muted-foreground)",
              background: "rgba(99,102,241,0.06)", borderRadius: "8px", padding: "10px 12px",
              border: "1px solid rgba(99,102,241,0.15)",
            }}>
              {result.cortexInsight}
            </p>
          </div>

          {result.steps?.length > 0 && (
            <div style={cardStyle}>
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: "10px" }}>Step Analysis</p>
              {result.steps.map((step, i) => (
                <div key={i} style={{
                  background: "var(--muted)", borderRadius: "8px", padding: "10px 12px",
                  marginBottom: "6px", fontSize: "13px",
                  borderLeft: `3px solid ${step.status === "correct" ? "#22c55e" : step.status === "incorrect" ? "var(--danger)" : "#f59e0b"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ color: "var(--muted-foreground)", fontSize: "11px" }}>Step {i + 1}</span>
                    <span style={{
                      fontSize: "10px", fontWeight: 600, padding: "1px 6px", borderRadius: "20px",
                      background: step.status === "correct" ? "rgba(34,197,94,0.15)" : step.status === "incorrect" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                      color: step.status === "correct" ? "#22c55e" : step.status === "incorrect" ? "var(--danger)" : "#f59e0b",
                    }}>
                      {step.status}
                    </span>
                  </div>
                  <p style={{ color: "var(--foreground)", margin: 0 }}>{step.description}</p>
                  {step.note && <p style={{ color: "var(--muted-foreground)", fontSize: "12px", margin: "4px 0 0" }}>{step.note}</p>}
                </div>
              ))}
            </div>
          )}

          <button onClick={reset} style={primaryBtn}>Check Another Question</button>
        </div>
      )}
    </div>
  );
}
