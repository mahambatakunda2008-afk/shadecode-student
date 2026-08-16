'use client';

import { useEffect, useState } from "react";

type AcademicContext = {
  pathway: "university" | "tvet";
  institution: string | null;
  programme: string;
  year_level: string | null;
  semester: string | null;
  courses: string[];
};

export function CoursesWorkspace() {
  const [context, setContext] = useState<AcademicContext | null>(null);
  const [course, setCourse] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/academic-context", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Failed to load academic context");
        setContext(payload.context);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load academic context"))
      .finally(() => setLoading(false));
  }, []);

  async function addCourse() {
    const value = course.trim();
    if (!context || !value || context.courses.includes(value)) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/academic-context", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, courses: [...context.courses, value] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to save course");
      setContext(payload.context);
      setCourse("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save course");
    } finally {
      setSaving(false);
    }
  }

  async function removeCourse(value: string) {
    if (!context) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/academic-context", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...context, courses: context.courses.filter((item) => item !== value) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to update courses");
      setContext(payload.context);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update courses");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>Loading your academic workspace…</main>;
  if (!context) return <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>Set up your university or TVET academic context in onboarding first.</main>;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 32 }}>
      <p style={{ fontSize: 12, opacity: 0.55 }}>Academic workspace</p>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: "6px 0" }}>{context.programme}</h1>
      <p style={{ opacity: 0.65 }}>{context.institution || "Independent study"}{context.year_level ? ` · ${context.year_level}` : ""}{context.semester ? ` · ${context.semester}` : ""}</p>

      <section style={{ marginTop: 28, padding: 20, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Courses / modules</h2>
        <p style={{ fontSize: 12, opacity: 0.55, marginTop: 4 }}>These become the units Cortex can organize around as course intelligence is added.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <input value={course} onChange={(e) => setCourse(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void addCourse(); }} placeholder="e.g. Data Structures" style={{ flex: 1, minWidth: 0, padding: "11px 12px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "inherit" }} />
          <button type="button" disabled={saving || !course.trim()} onClick={() => void addCourse()} style={{ padding: "11px 16px", borderRadius: 10, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}>{saving ? "Saving…" : "Add"}</button>
        </div>
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {context.courses.length === 0 ? <p style={{ fontSize: 13, opacity: 0.5 }}>No courses yet. Add the modules you are taking.</p> : context.courses.map((item) => <div key={item} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.03)" }}><span>{item}</span><button type="button" onClick={() => void removeCourse(item)} disabled={saving} style={{ opacity: 0.6 }}>Remove</button></div>)}
        </div>
      </section>
      {error && <p style={{ marginTop: 14, color: "#f87171", fontSize: 13 }}>{error}</p>}
    </main>
  );
}
