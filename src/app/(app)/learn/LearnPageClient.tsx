"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles, Star, Clock, ChevronRight, BookOpen,
  Zap, Dna, Globe, FlaskConical, Calculator, Wand2,
  ArrowRight, RotateCcw, Brain, Atom,
  Music, Palette, Code2, TrendingUp, Flame, Languages,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import type { LearnLesson, LearnSubject, LearnSummary } from "./types";
import CurriculumProgressCard from "@/components/CurriculumProgressCard";
import LearningJourney from "@/components/LearningJourney";

/* ─────────────────────────────────────────
   THEME MAP
───────────────────────────────────────── */

type SubjectTheme = {
  hex: string; bg: string; border: string; text: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
};

const THEMES: Record<string, SubjectTheme> = {
  Mathematics:        { hex: "#8b5cf6", bg: "rgba(139,92,246,0.18)",  border: "rgba(139,92,246,0.3)",  text: "#c4b5fd", icon: Calculator   },
  Physics:            { hex: "#3b82f6", bg: "rgba(59,130,246,0.18)",  border: "rgba(59,130,246,0.3)",  text: "#93c5fd", icon: Zap          },
  Biology:            { hex: "#10b981", bg: "rgba(16,185,129,0.18)",  border: "rgba(16,185,129,0.3)",  text: "#6ee7b7", icon: Dna          },
  History:            { hex: "#f59e0b", bg: "rgba(245,158,11,0.18)",  border: "rgba(245,158,11,0.3)",  text: "#fcd34d", icon: Globe        },
  Chemistry:          { hex: "#06b6d4", bg: "rgba(6,182,212,0.18)",   border: "rgba(6,182,212,0.3)",   text: "#67e8f9", icon: FlaskConical },
  Geography:          { hex: "#14b8a6", bg: "rgba(20,184,166,0.18)",  border: "rgba(20,184,166,0.3)",  text: "#5eead4", icon: Globe        },
  "Computer Science": { hex: "#6366f1", bg: "rgba(99,102,241,0.18)",  border: "rgba(99,102,241,0.3)",  text: "#a5b4fc", icon: Code2        },
  Psychology:         { hex: "#ec4899", bg: "rgba(236,72,153,0.18)",  border: "rgba(236,72,153,0.3)",  text: "#f9a8d4", icon: Brain        },
  Economics:          { hex: "#22c55e", bg: "rgba(34,197,94,0.18)",   border: "rgba(34,197,94,0.3)",   text: "#86efac", icon: TrendingUp   },
  Languages:          { hex: "#f43f5e", bg: "rgba(244,63,94,0.18)",   border: "rgba(244,63,94,0.3)",   text: "#fda4af", icon: Languages    },
  Music:              { hex: "#a855f7", bg: "rgba(168,85,247,0.18)",  border: "rgba(168,85,247,0.3)",  text: "#d8b4fe", icon: Music        },
  Art:                { hex: "#f97316", bg: "rgba(249,115,22,0.18)",  border: "rgba(249,115,22,0.3)",  text: "#fdba74", icon: Palette      },
  default:            { hex: "var(--muted-foreground)", bg: "rgba(100,116,139,0.18)", border: "rgba(100,116,139,0.3)", text: "var(--muted-foreground)", icon: BookOpen     },
};

function theme(name: string): SubjectTheme {
  return THEMES[name] ?? THEMES.default;
}

const DIFFICULTIES = [
  { value: "easy",   label: "Guided",    desc: "Step-by-step",  color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)"  },
  { value: "medium", label: "Standard",  desc: "Balanced",      color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)"  },
  { value: "hard",   label: "Challenge", desc: "Deep dive",     color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)"  },
] as const;

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */

function ago(iso: string): string {
  if (!iso) return "";
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1)  return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 30)  return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function getGenerationStepText(step: number): string {
  switch (step) {
    case 1: return "Analyzing topic...";
    case 2: return "Gathering content...";
    case 3: return "Structuring lesson...";
    case 4: return "Finalizing...";
    default: return "Generating...";
  }
}

/* ─────────────────────────────────────────
   COMPONENT
───────────────────────────────────────── */

export default function LearnPageClient() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [subjects,   setSubjects]   = useState<LearnSubject[]>([]);
  const [lessons,    setLessons]    = useState<LearnLesson[]>([]);
  const [summary,    setSummary]    = useState<LearnSummary | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [token,      setToken]      = useState<string | null>(null);

  const [subject,    setSubject]    = useState("");
  const [topic,      setTopic]      = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [generating, setGenerating] = useState(false);
  const [genErr,     setGenErr]     = useState<string | null>(null);
  const [savingRevision, setSavingRevision] = useState(false);
  const [genStep,    setGenStep]    = useState(0);
  const [genStartTime, setGenStartTime] = useState<number>(0);

  useEffect(() => {
    const s = searchParams.get("subject");
    if (s) setSubject(s);
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setToken(session.access_token);
      await load(session.access_token);
    })();
  }, []);

  async function load(tok: string) {
    try {
      setLoading(true); setError(null);
      const r = await fetch("/api/learn", { headers: { Authorization: `Bearer ${tok}` } });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setSubjects(d.subjects ?? []);
      setLessons(d.lessons ?? []);
      setSummary(d.summary ?? null);
    } catch {
      setError("Couldn't load your lessons.");
    } finally {
      setLoading(false);
    }
  }

  async function saveToRevision(lesson: { title: string; content: string; subject: string }) {
    if (!token) return;
    setSavingRevision(true);
    try {
      await fetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: lesson.title, content: lesson.content ?? "", subject }),
      });
    } catch (e) {
      console.error("Revision save failed", e);
    } finally {
      setSavingRevision(false);
    }
  }

  async function generate() {
    if (!subject || !topic.trim() || !token) return;
    setGenerating(true);
    setGenErr(null);
    setGenStep(1);
    setGenStartTime(Date.now());
    
    try {
      // Simulate step progression for better UX
      setGenStep(1); // Analyzing topic
      await new Promise(r => setTimeout(r, 500));
      
      setGenStep(2); // Gathering content
      const r = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "lesson", subject, topic: topic.trim(), difficulty }),
      });
      
      setGenStep(3); // Structuring lesson
      const d = await r.json();

      if (!r.ok || d?.error) {
        setGenErr(d?.error || "Couldn't generate the lesson. Try a different topic.");
        return;
      }

      if (d?.id) {
        setGenStep(4); // Finalizing
        await new Promise(r => setTimeout(r, 300));
        router.push(`/learn/${d.id}`);
        return;
      }

      setGenErr("Couldn't generate the lesson. Try a different topic.");
    } catch {
      setGenErr("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
      setGenStep(0);
    }
  }

  /* ── Derived ── */
  const recentLessons = [...lessons]
    .sort((a, b) => ((b as any).updated_at ?? "").localeCompare((a as any).updated_at ?? ""))
    .slice(0, 5);

  const selectedTheme = subject ? theme(subject) : null;

  /* ─────────────────────────────────────────
     LOADING
  ───────────────────────────────────────── */
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 36, height: 36 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.15)" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#8b5cf6", animation: "spin 0.8s linear infinite" }} />
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }

        .learn-gen-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
        .learn-gen-btn:disabled             { opacity: 0.5; cursor: not-allowed; }
        .subj-pill:hover                    { border-color: var(--card-border) !important; color: var(--foreground) !important; }
        .diff-btn:hover                     { filter: brightness(1.1); }
        .lesson-row:hover                   { background: var(--card-border) !important; }
        .subj-card:hover                    { transform: translateY(-2px); border-color: var(--card-border) !important; }
        .topic-input:focus                  { border-color: rgba(139,92,246,0.5) !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.08); }
        .quick-link:hover                   { background: var(--card-border) !important; }

        @media (max-width: 767px) {
          .learn-main-container { padding: 16px !important; }
          .learn-layout-grid { grid-template-columns: 1fr !important; }
          .learn-sidebar { position: static !important; width: 100% !important; }
          .learn-stats-grid { grid-template-columns: 1fr !important; }
          .learn-quick-links { grid-template-columns: 1fr !important; }
          .learn-subject-cards { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important; }
          .curriculum-card { padding: 16px !important; }
          .curriculum-stats-grid { gap: 8 !important; margin-bottom: 12 !important; }
          .curriculum-stat { padding: 8px 10px !important; }
        }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden>
        <div style={{ position: "absolute", top: -120, left: "35%", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(109,40,217,0.1) 0%, transparent 65%)", borderRadius: "50%" }} />
      </div>

      <div className="learn-main-container" style={{ position: "relative", maxWidth: 1120, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Two-column layout ── */}
        <div className="learn-layout-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 28, alignItems: "start" }}>

          {/* ═══════════════════════════════════
              LEFT COLUMN — Main content
          ═══════════════════════════════════ */}
          <main style={{ minWidth: 0 }}>

            {/* ── Page header ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={17} color="#c4b5fd" />
                </div>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "var(--foreground)" }}>AI Learn</h1>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>Generate lessons, study smarter</p>
                </div>
              </div>
            </div>

            {/* ── Stats bar ── */}
            {summary && (
              <div className="learn-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24, animation: "fadeUp .4s ease" }}>
                {[
                  { icon: <Zap size={14} color="#fbbf24" />, label: "XP", value: `${summary.currentXP} / ${summary.xpGoal}` },
                  { icon: <Flame size={14} color="#f97316" />, label: "Streak", value: `${summary.currentStreak}d` },
                  { icon: <Star size={14} color="#a78bfa" />, label: "Level", value: summary.level },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{ background: "var(--surface-2)", border: "1px solid var(--card-border)", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {icon}
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: 0, fontWeight: 600 }}>{label}</p>
                      <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--foreground)" }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Generation card ── */}
            <div style={{ background: "linear-gradient(160deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.04) 100%)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 20, padding: 24, marginBottom: 24, animation: "fadeUp .4s ease .05s both" }}>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                <Wand2 size={16} color="#a78bfa" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#c4b5fd" }}>Generate a Lesson</span>
              </div>

              {/* Subject pills */}
              {subjects.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Subject</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {subjects.map(s => {
                      const t      = theme(s.name);
                      const active = subject === s.name;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSubject(active ? "" : s.name)}
                          className="subj-pill"
                          style={{
                            fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 999,
                            border: "1px solid", cursor: "pointer", transition: "all .15s",
                            background: active ? t.bg : "var(--surface-2)",
                            borderColor: active ? t.border : "var(--card-border)",
                            color: active ? t.text : "var(--muted-foreground)",
                          }}
                        >
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Topic input */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Topic</p>
                <input
                  className="topic-input"
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && generate()}
                  placeholder={subject ? `e.g. "Photosynthesis", "Newton's Laws"…` : "Select a subject first…"}
                  disabled={!subject}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "var(--surface-2)", border: "1px solid var(--card-border)",
                    borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "var(--foreground)",
                    outline: "none", transition: "border-color .15s, box-shadow .15s",
                    opacity: subject ? 1 : 0.5,
                  }}
                />
              </div>

              {/* Difficulty */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Difficulty</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d.value}
                      onClick={() => setDifficulty(d.value)}
                      className="diff-btn"
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid",
                        cursor: "pointer", transition: "all .15s", textAlign: "center",
                        background: difficulty === d.value ? d.bg : "var(--surface-2)",
                        borderColor: difficulty === d.value ? d.border : "var(--card-border)",
                      }}
                    >
                      <p style={{ fontSize: 12, fontWeight: 700, color: difficulty === d.value ? d.color : "var(--muted-foreground)", margin: 0 }}>{d.label}</p>
                      <p style={{ fontSize: 10, color: difficulty === d.value ? d.color : "var(--muted-foreground)", margin: "2px 0 0", opacity: 0.8 }}>{d.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={generate}
                disabled={generating || !subject || !topic.trim()}
                className="learn-gen-btn"
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 14, border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                  color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  transition: "filter .15s, transform .15s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {generating ? (
                  <>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--card-border)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                    {savingRevision ? "Saving to revisions…" : getGenerationStepText(genStep)}
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Generate Lesson
                  </>
                )}
              </button>

              {/* Generation progress steps */}
              {generating && (
                <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { step: 1, label: "Analyzing topic" },
                      { step: 2, label: "Gathering content" },
                      { step: 3, label: "Structuring lesson" },
                      { step: 4, label: "Finalizing" },
                    ].map(({ step, label }) => (
                      <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: "50%",
                          background: genStep >= step ? "#8b5cf6" : "var(--card-border)",
                          border: genStep >= step ? "none" : "1px solid var(--card-border)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "background .3s, border .3s"
                        }}>
                          {genStep > step && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                          {genStep === step && <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid var(--card-border)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />}
                        </div>
                        <span style={{ fontSize: 12, color: genStep >= step ? "var(--card-border)" : "var(--muted-foreground)", fontWeight: genStep === step ? 600 : 400 }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted-foreground)" }}>
                    Estimated time: ~10-15 seconds
                  </div>
                </div>
              )}

              {/* Error */}
              {genErr && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10 }}>
                  <AlertCircle size={14} color="var(--danger)" />
                  <p style={{ fontSize: 13, color: "var(--danger)", margin: 0 }}>{genErr}</p>
                </div>
              )}
            </div>

            {/* ── Quick links ── */}
            <div className="learn-quick-links" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24, animation: "fadeUp .4s ease .1s both" }}>
              {[
                { href: "/learn/history",  icon: <Clock size={15} color="var(--muted-foreground)" />,  label: "Lesson History" },
                { href: "/learn/subjects", icon: <BookOpen size={15} color="var(--muted-foreground)" />, label: "Subjects" },
                { href: "/learn/study",    icon: <Brain size={15} color="var(--muted-foreground)" />,   label: "Focus Session" },
              ].map(({ href, icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="quick-link"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "11px 0", borderRadius: 12,
                    background: "var(--surface-2)", border: "1px solid var(--card-border)",
                    fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", textDecoration: "none",
                    transition: "background .15s",
                  }}
                >
                  {icon} {label}
                </Link>
              ))}
            </div>

            {/* ── Error state ── */}
            {error && (
              <div style={{ padding: "20px 24px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: "var(--danger)", margin: 0 }}>{error}</p>
              </div>
            )}

            {/* ── Recent lessons ── */}
            {recentLessons.length > 0 && (
              <div style={{ animation: "fadeUp .4s ease .15s both" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={14} color="var(--muted-foreground)" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)" }}>Recent Lessons</span>
                  </div>
                  <Link href="/learn/history" style={{ fontSize: 12, color: "#6366f1", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                    View all <ArrowRight size={12} />
                  </Link>
                </div>

                <div style={{ background: "var(--card)", border: "1px solid var(--card-border)", borderRadius: 18, overflow: "hidden" }}>
                  {recentLessons.map((l, i) => {
                    const t    = theme(l.subject);
                    const Icon = t.icon;
                    const date = (l as any).updated_at ?? "";

                    return (
                      <Link
                        key={l.id}
                        href={`/learn/${l.id}`}
                        className="lesson-row"
                        style={{
                          display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
                          textDecoration: "none", color: "#fff", transition: "background .15s",
                          borderBottom: i < recentLessons.length - 1 ? "1px solid var(--card-border)" : "none",
                          position: "relative",
                        }}
                      >
                        {/* Colour bar */}
                        <div style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: "0 3px 3px 0", background: t.hex, opacity: l.completed ? 1 : 0.45 }} />

                        {/* Icon */}
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                          <Icon size={16} color={t.text} />
                          {l.completed && (
                            <div style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "#10b981", border: "2px solid #0e0e1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <CheckCircle2 size={7} color="#fff" />
                            </div>
                          )}
                        </div>

                        {/* Title + meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: l.completed ? "var(--muted-foreground)" : "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</p>
                          <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{l.subject}{date ? ` · ${ago(date)}` : ""}</p>
                        </div>

                        {/* Progress bar */}
                        <div style={{ width: 52, flexShrink: 0 }}>
                          <div style={{ height: 3, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${l.progress}%`, background: l.completed ? "#10b981" : t.hex, borderRadius: 999 }} />
                          </div>
                          <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "3px 0 0", textAlign: "right" }}>{l.progress}%</p>
                        </div>

                        <ChevronRight size={14} color="var(--muted-foreground)" style={{ flexShrink: 0 }} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Subject cards ── */}
            {subjects.length > 0 && (
              <div style={{ marginTop: 28, animation: "fadeUp .4s ease .2s both" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <BookOpen size={14} color="var(--muted-foreground)" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted-foreground)" }}>Your Subjects</span>
                  </div>
                  <Link href="/learn/subjects" style={{ fontSize: 12, color: "#6366f1", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                    Manage <ArrowRight size={12} />
                  </Link>
                </div>

                <div className="learn-subject-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {subjects.map(s => {
                    const t    = theme(s.name);
                    const Icon = t.icon;
                    return (
                      <Link
                        key={s.id}
                        href={`/learn?subject=${encodeURIComponent(s.name)}`}
                        className="subj-card"
                        style={{
                          display: "block", textDecoration: "none",
                          background: "var(--card)",
                          border: "1px solid var(--card-border)", borderRadius: 16,
                          padding: "18px 20px", transition: "transform .2s, border-color .2s",
                        }}
                        onClick={e => { e.preventDefault(); setSubject(s.name); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={18} color={t.text} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>
                              {s.lessonCount} lesson{s.lessonCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <ChevronRight size={14} color="var(--muted-foreground)" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Empty state (no subjects) ── */}
            {!loading && subjects.length === 0 && !error && (
              <div style={{ textAlign: "center", padding: "60px 0", animation: "fadeUp .4s ease" }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <BookOpen size={24} color="#8b5cf6" />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--muted-foreground)", margin: "0 0 6px" }}>No subjects yet</p>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>Complete onboarding to add subjects and start generating lessons.</p>
              </div>
            )}

          </main>

          {/* ═══════════════════════════════════
              RIGHT COLUMN — Sidebar
          ═══════════════════════════════════ */}
          <aside className="learn-sidebar" style={{ width: 340, position: "sticky", top: 24 }}>
            <CurriculumProgressCard />
            <div style={{ height: 16 }} />
          </aside>

        </div>
      </div>
    </div>
  );
}
