"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { offlineStorage } from "@/lib/offline/storage";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/fetchWithTimeout";
import { BookOpen, Sparkles, Loader2, AlertCircle, RefreshCw, CloudOff } from "lucide-react";
import type { LearnLesson, LearnSubject, LearnSummary } from "./types";

const AUTH_TIMEOUT = 3_000;
const LOAD_TIMEOUT = 8_000;
const GENERATE_TIMEOUT = 45_000;
type ApiResponse = { subjects?: LearnSubject[]; lessons?: LearnLesson[]; summary?: LearnSummary; error?: string; id?: string };

async function readDeviceLessons(): Promise<LearnLesson[]> {
  try {
    const rows = await offlineStorage.getAllLessons();
    return rows.map(row => ({ id: row.id, title: row.title, subject: row.subject, subjectId: "", description: row.description ?? "", difficulty: (row.difficulty === "hard" || row.difficulty === "medium" ? row.difficulty : "easy") as LearnLesson["difficulty"], progress: 0, completed: false }));
  } catch { return []; }
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
  const [offline, setOffline] = useState(typeof navigator !== "undefined" && !navigator.onLine);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [generating, setGenerating] = useState(false);

  useEffect(() => { setSubject(params.get("subject")?.trim() ?? ""); setTopic(params.get("topic")?.trim() ?? ""); }, [params]);
  useEffect(() => { const on = () => setOffline(false), off = () => setOffline(true); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      // DEVICE FIRST: local content is rendered before auth, network, or Supabase work.
      const local = await readDeviceLessons();
      if (!cancelled && local.length) setLessons(local);
      if (cancelled) return;
      if (!navigator.onLine) { setLoading(false); return; }
      try {
        const sb = createClient();
        const result = await Promise.race([sb.auth.getSession(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timed out")), AUTH_TIMEOUT))]);
        if (cancelled) return;
        const session = result.data.session;
        if (!session) { setLoading(false); return; }
        setToken(session.access_token);
        await load(session.access_token);
      } catch (e) {
        if (!cancelled && !local.length) setError(e instanceof Error && e.message === "Timed out" ? "Cloud sync took too long. Your device data remains available." : "Cloud sync unavailable. Your device data remains available.");
      } finally { if (!cancelled) setLoading(false); }
    };
    void boot(); return () => { cancelled = true; };
  }, []);

  async function load(tok: string) {
    try {
      const r = await fetchWithTimeout("/api/learn", { headers: { Authorization: `Bearer ${tok}` }, cache: "no-store" }, LOAD_TIMEOUT);
      const data = await r.json().catch(() => ({} as ApiResponse));
      if (!r.ok) throw new Error(data.error || `Learn sync failed (${r.status})`);
      setSubjects(data.subjects ?? []); setLessons(data.lessons ?? []); setSummary(data.summary ?? null);
      for (const lesson of data.lessons ?? []) await offlineStorage.saveLesson({ id: lesson.id, title: lesson.title, subject: lesson.subject, description: lesson.description, difficulty: lesson.difficulty, downloadedAt: new Date().toISOString(), lastSyncedAt: new Date().toISOString(), size: JSON.stringify(lesson).length });
    } catch (e) { if (!lessons.length) setError(e instanceof FetchTimeoutError ? "Cloud sync timed out. Device data is still available." : e instanceof Error ? e.message : "Cloud sync failed."); }
  }

  async function generate() {
    if (!token || !subject || !topic.trim() || generating || offline) return;
    setGenerating(true); setError(null);
    try {
      const r = await fetchWithTimeout("/api/learn", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ type: "lesson", subject, topic: topic.trim(), difficulty }) }, GENERATE_TIMEOUT);
      const data = await r.json().catch(() => ({} as ApiResponse));
      if (!r.ok || data.error) throw new Error(data.error || "Couldn't generate the lesson.");
      if (data.id) router.push(`/learn/${data.id}`); else throw new Error("The lesson service returned no lesson ID.");
    } catch (e) { setError(e instanceof FetchTimeoutError ? "Generation timed out. No endless spinner. Try again when connected." : e instanceof Error ? e.message : "Generation failed."); }
    finally { setGenerating(false); }
  }

  if (loading && lessons.length === 0) return <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", color: "var(--muted-foreground)" }}><Loader2 className="animate-spin" size={28} /></div>;

  return <main style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px", color: "var(--foreground)" }}>
    <header style={{ marginBottom: 24 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Sparkles size={20} /><h1 style={{ margin: 0, fontSize: 28 }}>Learn</h1>{offline && <CloudOff size={17} aria-label="Offline" />}</div><p style={{ color: "var(--muted-foreground)" }}>{offline ? "Working from this device. Cloud sync will happen when you're back online." : "Learn a concept, build understanding, then put it to work."}</p></header>
    {error && <div role="alert" style={{ display: "flex", gap: 10, alignItems: "center", padding: 14, marginBottom: 20, border: "1px solid var(--card-border)", borderRadius: 12 }}><AlertCircle size={18} /><span style={{ flex: 1 }}>{error}</span>{token && !offline && <button onClick={() => void load(token)} aria-label="Retry cloud sync" style={{ display: "inline-flex", gap: 6, alignItems: "center", padding: "8px 12px", borderRadius: 9, border: "1px solid var(--card-border)", background: "var(--surface)", color: "inherit", cursor: "pointer" }}><RefreshCw size={14} /> Retry</button>}</div>}
    <section style={{ padding: 20, border: "1px solid var(--card-border)", borderRadius: 16, background: "var(--surface)", marginBottom: 24 }}><h2 style={{ marginTop: 0, fontSize: 18 }}>Start a lesson</h2><div style={{ display: "grid", gap: 12 }}><select value={subject} onChange={e => setSubject(e.target.value)} aria-label="Subject" style={{ padding: 12, borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--background)", color: "inherit" }}><option value="">Choose a subject</option>{subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select><input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What do you want to learn?" aria-label="Topic" style={{ padding: 12, borderRadius: 10, border: "1px solid var(--card-border)", background: "var(--background)", color: "inherit" }} /><div style={{ display: "flex", gap: 8 }}>{["easy", "medium", "hard"].map(v => <button key={v} type="button" onClick={() => setDifficulty(v)} aria-pressed={difficulty === v} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid var(--card-border)", background: difficulty === v ? "var(--primary-glow)" : "transparent", color: "inherit", cursor: "pointer", textTransform: "capitalize" }}>{v}</button>)}</div><button onClick={() => void generate()} disabled={!token || !subject || !topic.trim() || generating || offline} style={{ padding: 12, border: 0, borderRadius: 10, background: "var(--primary)", color: "white", cursor: "pointer", opacity: generating || offline ? .7 : 1 }}>{offline ? "Connect to generate" : generating ? "Generating lesson…" : "Generate lesson"}</button></div></section>
    <section><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h2 style={{ fontSize: 18 }}>Your lessons</h2>{summary && <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>Level {summary.level} · {summary.currentXP} XP</span>}</div>{lessons.length === 0 ? <div style={{ padding: 24, border: "1px dashed var(--card-border)", borderRadius: 14, color: "var(--muted-foreground)" }}>No lessons cached yet. Connect once to sync your lessons.</div> : <div style={{ display: "grid", gap: 8 }}>{lessons.slice(0, 10).map(l => <button key={l.id} onClick={() => router.push(`/learn/${l.id}`)} style={{ textAlign: "left", padding: 14, border: "1px solid var(--card-border)", borderRadius: 12, background: "var(--surface)", color: "inherit", cursor: "pointer" }}><BookOpen size={16} style={{ marginRight: 8, verticalAlign: "middle" }} /><strong>{l.title}</strong><div style={{ marginTop: 5, color: "var(--muted-foreground)", fontSize: 13 }}>{l.subject} · {l.progress ?? 0}% complete</div></button>)}</div>}</section>
  </main>;
}
