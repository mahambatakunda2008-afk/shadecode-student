"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/fetchWithTimeout";
import { BookOpen, Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import type { LearnLesson, LearnSubject, LearnSummary } from "./types";

const AUTH_TIMEOUT = 3_000;
const LOAD_TIMEOUT = 8_000;
const GENERATE_TIMEOUT = 45_000;

type ApiResponse = { subjects?: LearnSubject[]; lessons?: LearnLesson[]; summary?: LearnSummary; error?: string; id?: string };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out")), ms);
    promise.then(v => { clearTimeout(timer); resolve(v); }, e => { clearTimeout(timer); reject(e); });
  });
}

export default function LearnPageResilient() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<LearnSubject[]>([]);
  const [lessons, setLessons] = useState<LearnLesson[]>([]);
  const [summary, setSummary] = useState<LearnSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setSubject(params.get("subject")?.trim() ?? "");
    setTopic(params.get("topic")?.trim() ?? "");
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      try {
        const sb = createClient();
        const result = await withTimeout(sb.auth.getSession(), AUTH_TIMEOUT);
        if (cancelled) return;
        const session = result.data.session;
        if (!session) { router.replace("/login"); return; }
        setToken(session.access_token);
        await load(session.access_token);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error && e.message === "Timed out" ? "Sign-in took too long. Please refresh and try again." : "Couldn't start Learn.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void boot();
    return () => { cancelled = true; };
  }, [router]);

  async function load(tok: string) {
    try {
      setError(null);
      const r = await fetchWithTimeout("/api/learn", { headers: { Authorization: `Bearer ${tok}` }, cache: "no-store" }, LOAD_TIMEOUT);
      const data = await r.json().catch(() => ({} as ApiResponse));
      if (!r.ok) throw new Error(data.error || `Learn request failed (${r.status})`);
      setSubjects(data.subjects ?? []);
      setLessons(data.lessons ?? []);
      setSummary(data.summary ?? null);
    } catch (e) {
      setError(e instanceof FetchTimeoutError ? "Learn took too long to respond. Your session is still safe. Try again." : e instanceof Error ? e.message : "Couldn't load your lessons.");
    }
  }

  async function generate() {
    if (!token || !subject || !topic.trim() || generating) return;
    setGenerating(true); setError(null);
    try {
      const r = await fetchWithTimeout("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "lesson", subject, topic: topic.trim(), difficulty }),
      }, GENERATE_TIMEOUT);
      const data = await r.json().catch(() => ({} as ApiResponse));
      if (!r.ok || data.error) throw new Error(data.error || "Couldn't generate the lesson.");
      if (data.id) router.push(`/learn/${data.id}`);
      else throw new Error("The lesson service returned no lesson ID.");
    } catch (e) {
      setError(e instanceof FetchTimeoutError ? "Lesson generation timed out. No endless spinner. Please try again." : e instanceof Error ? e.message : "Generation failed. Please try again.");
    } finally { setGenerating(false); }
  }

  if (loading) return <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", color: "var(--muted-foreground)" }}><Loader2 className="animate-spin" size={28} /></div>;

  return <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px", color: "var(--foreground)" }}>
    <header style={{ marginBottom: 24 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Sparkles size={20} /><h1 style={{ margin: 0, fontSize: 28 }}>Learn</h1></div><p style={{ color: "var(--muted-foreground)" }}>Learn a concept, build understanding, then put it to work.</p></header>
    {error && <div role="alert" style={{ display: "flex", gap: 10, alignItems: "center", padding: 14, marginBottom: 20, border: "1px solid var(--card-border)", borderRadius: 12 }}><AlertCircle size={18} /><span style={{ flex: 1 }}>{error}</span>{token && <button onClick={() => void load(token)} aria-label="Retry loading Learn" style={{ display: "inline-flex", gap: 6, alignItems: "center", padding: "8px 12px", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--surface)", color: "inherit", cursor: "pointer" }}><RefreshCw size={14} /> Retry</button>}</div>}
    <section style={{ padding: 20, border: "1px solid var(--card-border)", borderRadius: 16, background: "var(--surface)", marginBottom: 24 }}>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>Start a lesson</h2>
      <div style={{ display: "grid", gap: 12 }}>
        <select value={subject} onChange={e => setSubject(e.target.value)} aria-label="Subject" style={{ padding: 12, borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--background)", color: "inherit" }}><option value="">Choose a subject</option>{subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
        <input className="topic-input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="What do you want to learn?" aria-label="Topic" style={{ padding: 12, borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--background)", color: "inherit" }} />
        <div style={{ display: "flex", gap: 8 }}>{["easy", "medium", "hard"].map(v => <button key={v} type="button" onClick={() => setDifficulty(v)} aria-pressed={difficulty === v} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid var(--card-border)", background: difficulty === v ? "var(--primary-glow)" : "transparent", color: "inherit", cursor: "pointer", textTransform: "capitalize" }}>{v}</button>)}</div>
        <button onClick={() => void generate()} disabled={!token || !subject || !topic.trim() || generating} style={{ padding: 12, border: 0, borderRadius: 10, background: "var(--primary)", color: "white", cursor: "pointer", opacity: generating ? .7 : 1 }}>{generating ? "Generating lesson…" : "Generate lesson"}</button>
      </div>
    </section>
    <section><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={{ fontSize: 18 }}>Your lessons</h2>{summary && <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Level {summary.level} · {summary.currentXP} XP</span>}</div>{lessons.length === 0 ? <div style={{ padding: 24, border: "1px dashed var(--card-border)", borderRadius: 14, color: "var(--muted-foreground)" }}>No lessons yet. Generate your first one above.</div> : <div style={{ display: "grid", gap: 8 }}>{lessons.slice(0, 10).map(l => <button key={l.id} onClick={() => router.push(`/learn/${l.id}`)} style={{ textAlign: "left", padding: 14, border: "1px solid var(--card-border)", borderRadius: 12, background: "var(--surface)", color: "inherit", cursor: "pointer" }}><BookOpen size={16} style={{ marginRight: 8, verticalAlign: "middle" }} /><strong>{l.title}</strong><div style={{ marginTop: 5, color: "var(--muted-foreground)", fontSize: 13 }}>{l.subject} · {l.progress ?? 0}% complete</div></button>)}</div>}</section>
  </main>;
}
