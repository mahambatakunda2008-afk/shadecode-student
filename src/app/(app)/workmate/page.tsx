"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MathCheckerPage from "../math-checker/page";

export default function WorkmatePage() {
  const [mode, setMode] = useState<"work" | "check" | "solve" | "teach">("work");
  const router = useRouter();

  return (
    <div style={{ minHeight: "100%", padding: "24px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>CORTEX</p>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: "4px 0" }}>Workmate</h1>
          <p style={{ color: "var(--muted-foreground)", margin: 0, maxWidth: 680 }}>
            Check your work, find mistakes, solve problems, understand difficult questions, and improve your answers across subjects.
          </p>
        </div>
        <button onClick={() => router.back()} style={{ background: "var(--muted)", border: "1px solid var(--card-border)", borderRadius: 8, padding: "9px 12px", color: "var(--foreground)", cursor: "pointer" }}>
          Back
        </button>
      </header>

      <nav aria-label="Workmate modes" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {[
          ["work", "Work on it"],
          ["check", "Check"],
          ["solve", "Help solve"],
          ["teach", "Teach me"],
        ].map(([value, label]) => (
          <button key={value} onClick={() => setMode(value as typeof mode)} aria-current={mode === value ? "page" : undefined} style={{ border: "1px solid var(--card-border)", borderRadius: 999, padding: "8px 13px", background: mode === value ? "var(--primary)" : "var(--muted)", color: "var(--foreground)", cursor: "pointer", fontWeight: 650 }}>
            {label}
          </button>
        ))}
      </nav>

      <section aria-label="Workmate workspace">
        {mode === "work" || mode === "check" ? (
          <MathCheckerPage />
        ) : (
          <div style={{ border: "1px solid var(--card-border)", borderRadius: 12, padding: 20, background: "var(--card)" }}>
            <h2 style={{ marginTop: 0 }}>{mode === "solve" ? "Help me solve this" : "Teach me this"}</h2>
            <p style={{ color: "var(--muted-foreground)", lineHeight: 1.6 }}>
              Workmate is being unified across subjects. The existing image-based working analyser is available above; these modes are the common interface for the subject-aware Cortex engines as they are connected.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
