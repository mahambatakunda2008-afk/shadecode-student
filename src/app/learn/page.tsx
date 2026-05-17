"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles, Star, Clock, ChevronRight, BookOpen,
  Zap, Dna, Globe, FlaskConical, Calculator, Wand2,
  ArrowRight, RotateCcw, Brain, Atom, Languages,
  Music, Palette, Code2, TrendingUp, Flame,
} from "lucide-react";
import type { LearnLesson, LearnSubject, LearnSummary } from "./types";

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
  default:            { hex: "#64748b", bg: "rgba(100,116,139,0.18)", border: "rgba(100,116,139,0.3)", text: "#94a3b8", icon: BookOpen     },
};

function theme(name: string): SubjectTheme {
  return THEMES[name] ?? THEMES.default;
}

const DIFF: Record<string, { label: string; bg: string; border: string; text: string }> = {
  easy:   { label: "Guided",    bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  text: "#6ee7b7" },
  medium: { label: "Standard",  bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)",  text: "#93c5fd" },
  hard:   { label: "Challenge", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.3)",  text: "#c4b5fd" },
};

function diff(d: string) { return DIFF[d] ?? DIFF.medium; }
function xp(d: string)   { return d === "hard" ? 30 : d === "medium" ? 25 : 20; }

function ago(iso: string): string {
  if (!iso) return "Recently";
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1)  return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

const SUGGESTIONS: Record<string, { topic: string; subtopic: string }[]> = {
  Mathematics:        [{ topic: "Calculus",        subtopic: "Differentiation"        }, { topic: "Algebra",       subtopic: "Quadratic Equations" }],
  Physics:            [{ topic: "Electricity",     subtopic: "Ohm's Law & Circuits"   }, { topic: "Mechanics",     subtopic: "Newton's Laws"       }],
  Biology:            [{ topic: "Genetics",        subtopic: "DNA Structure"           }, { topic: "Cell Division", subtopic: "Mitosis & Meiosis"   }],
  History:            [{ topic: "World War II",    subtopic: "Causes & Events"         }, { topic: "Cold War",      subtopic: "USA vs USSR"         }],
  Chemistry:          [{ topic: "Chemical Bonds",  subtopic: "Ionic & Covalent"        }, { topic: "Periodic Table",subtopic: "Element Groups"      }],
  Geography:          [{ topic: "Plate Tectonics", subtopic: "Earthquakes & Volcanoes" }],
  "Computer Science": [{ topic: "Algorithms",      subtopic: "Sorting & Searching"     }],
  Economics:          [{ topic: "Supply & Demand", subtopic: "Market Equilibrium"      }],
  Psychology:         [{ topic: "Memory",          subtopic: "Storage & Retrieval"     }],
  Languages:          [{ topic: "Grammar",         subtopic: "Tenses & Structure"      }],
};

const CARD: React.CSSProperties = {
  background: "linear-gradient(160deg, #12122a 0%, #0e0e20 100%)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 20,
  overflow: "hidden",
};

const INPUT: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  padding: "12px 14px 12px 42px",
  fontSize: 14,
  color: "#fff",
  outline: "none",
  transition: "border-color .15s",
};

export default function LearnPageClient() {
  const router = useRouter();

  const [subjects, setSubjects] = useState<LearnSubject[]>([]);
  const [lessons,  setLessons]  = useState<LearnLesson[]>([]);
  const [summary,  setSummary]  = useState<LearnSummary | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [token,    setToken]    = useState<string | null>(null);

  const [subject,    setSubject]    = useState("");
  const [topic,      setTopic]      = useState("");
  const [generating, setGenerating] = useState(false);
  const [genErr,     setGenErr]     = useState<string | null>(null);

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
    } catch { setError("Couldn't load your lessons."); }
    finally  { setLoading(false); }
  }

  async function generate() {
    if (!subject || !topic.trim() || !token) return;
    setGenerating(true); setGenErr(null);
    try {
      const r = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: "lesson", subject, topic: topic.trim() }),
      });
      const d = await r.json();
      if (d?.id) {
        // Saved — navigate to the lesson detail page
        router.push(`/learn/${d.id}`);
      } else if (d?.title && Array.isArray(d?.blocks)) {
        // Generated but not saved (subject not found in DB) — store in sessionStorage and redirect
        sessionStorage.setItem("unsaved_lesson", JSON.stringify({ ...d, subject }));
        router.push(`/learn/preview`);
      } else {
        setGenErr("Couldn't generate the lesson. Try a different topic.");
      }
    } catch { setGenErr("Generation failed. Please try again."); }
    finally  { setGenerating(false); }
  }

  const suggestions = subjects
    .flatMap(s => (SUGGESTIONS[s.name] ?? []).slice(0, 1).map(t => ({ ...t, subject: s.name })))
    .slice(0, 5);

  const recent = [...lessons]
    .sort((a, b) => ((b as any).updated_at ?? "").localeCompare((a as any).updated_at ?? ""))
    .slice(0, 4);

  const canGenerate = subject && topic.trim() && !generating;

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#09091a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", width: 36, height: 36 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.2)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#8b5cf6", animation: "spin 0.8s linear infinite" }} />
        </div>
        <p style={{ color: "#64748b", fontSize: 13 }}>Loading your lessons…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#09091a", color: "#fff" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .learn-input:focus { border-color: rgba(139,92,246,0.6) !important; box-shadow: 0 0 0 3px rgba(139,92,246,0.12); }
        .topic-card:hover  { transform: translateY(-3px); border-color: rgba(255,255,255,0.13) !important; }
        .lesson-row:hover  { background: rgba(255,255,255,0.025) !important; }
        .gen-btn:not(:disabled):hover  { filter: brightness(1.1); }
        .gen-btn:not(:disabled):active { transform: scale(0.99); }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden>
        <div style={{ position: "absolute", top: -120, left: "50%", transform: "translateX(-50%)", width: 800, height: 500, background: "radial-gradient(ellipse, rgba(109,40,217,0.14) 0%, transparent 65%)", borderRadius: "50%" }} />
      </div>

      <div style={{ position: "relative", maxWidth: 900, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 28 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: "linear-gradient(135deg, rgba(139,92,246,0.4), rgba(139,92,246,0.12))", border: "1px solid rgba(139,92,246,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Sparkles size={18} color="#a78bfa" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1, margin: 0 }}>AI Learn</h1>
              <p style={{ fontSize: 12, color: "#475569", margin: "4px 0 0" }}>Personalized lessons powered by AI</p>
            </div>
          </div>

          {summary && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {summary.currentStreak > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", borderRadius: 12, padding: "8px 12px" }}>
                  <Flame size={14} color="#fb923c" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fdba74" }}>{summary.currentStreak}d</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#111128", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 16px" }}>
                <Star size={14} color="#fbbf24" fill="#fbbf24" />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1 }}>{summary.currentXP.toLocaleString()} XP</p>
                  <p style={{ fontSize: 11, color: "#475569", margin: "3px 0 0" }}>Level {summary.level}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Hero card ── */}
        <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "radial-gradient(ellipse at 80% 15%, rgba(109,40,217,0.25) 0%, transparent 55%), radial-gradient(ellipse at 5% 90%, rgba(37,99,235,0.14) 0%, transparent 50%), linear-gradient(160deg, #141432 0%, #0f0f28 50%, #0c0c1e 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.7), transparent)" }} />

          <div style={{ display: "flex", alignItems: "flex-start", gap: 40, padding: "36px 40px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>What will you learn today?</h2>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 28px", lineHeight: 1.65 }}>
                Choose a subject, enter a topic, and let AI create a personalized lesson for you.
              </p>

              <div style={{ position: "relative", marginBottom: 12 }}>
                <BookOpen size={15} color="#475569" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <select value={subject} onChange={e => setSubject(e.target.value)} className="learn-input"
                  style={{ ...INPUT, paddingRight: 40, appearance: "none", cursor: "pointer", WebkitAppearance: "none" }}>
                  <option value="" disabled>Select subject</option>
                  {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <ChevronRight size={14} color="#475569" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%) rotate(90deg)", pointerEvents: "none" }} />
              </div>

              <div style={{ position: "relative", marginBottom: 16 }}>
                <Wand2 size={15} color="#475569" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input type="text" placeholder="Enter topic to learn..." value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && generate()}
                  className="learn-input" style={{ ...INPUT }} />
              </div>

              <button onClick={generate} disabled={!canGenerate} className="gen-btn"
                style={{ width: "100%", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 600, color: "#fff", background: "linear-gradient(135deg, #7c3aed 0%, #5046e4 50%, #2563eb 100%)", border: "none", cursor: canGenerate ? "pointer" : "not-allowed", opacity: canGenerate ? 1 : 0.45, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: canGenerate ? "0 0 28px rgba(109,40,217,0.45), 0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)" : "none", transition: "opacity .15s, filter .15s, transform .1s" }}>
                {generating ? (
                  <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />Generating lesson…</>
                ) : (
                  <><Sparkles size={15} /> Generate Lesson <ArrowRight size={15} /></>
                )}
              </button>

              {genErr && <p style={{ fontSize: 12, color: "#f87171", textAlign: "center", marginTop: 10 }}>{genErr}</p>}
            </div>

            <div style={{ flexShrink: 0, alignSelf: "center", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, opacity: 0.45 }}>
              {[
                { I: Atom,         c: "#a78bfa", b: "rgba(139,92,246,0.22)" },
                { I: Brain,        c: "#93c5fd", b: "rgba(59,130,246,0.22)" },
                { I: FlaskConical, c: "#67e8f9", b: "rgba(6,182,212,0.22)"  },
                { I: Calculator,   c: "#6ee7b7", b: "rgba(16,185,129,0.22)" },
                { I: Globe,        c: "#fcd34d", b: "rgba(245,158,11,0.22)" },
                { I: Code2,        c: "#a5b4fc", b: "rgba(99,102,241,0.22)" },
              ].map(({ I, c, b }, i) => (
                <div key={i} style={{ width: 48, height: 48, borderRadius: 14, background: b, border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <I size={20} color={c} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.3), transparent)" }} />
        </div>

        {/* ── Suggested topics ── */}
        {suggestions.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                <Sparkles size={14} color="#a78bfa" /> Suggested topics for you
              </h3>
              <Link href="/subjects" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#475569", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 10px", textDecoration: "none" }}>
                View all subjects <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24, scrollbarWidth: "none" }}>
              {suggestions.map((item, i) => {
                const t = theme(item.subject);
                const Icon = t.icon;
                return (
                  <button key={i} className="topic-card" onClick={() => { setSubject(item.subject); setTopic(item.topic); }}
                    style={{ flexShrink: 0, width: 190, background: "linear-gradient(150deg, #141432 0%, #101024 100%)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "20px 18px", textAlign: "left", cursor: "pointer", transition: "transform .2s, border-color .2s", color: "#fff" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                      <Icon size={20} color={t.text} />
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.topic}</p>
                    <p style={{ fontSize: 12, color: "#475569", margin: "0 0 16px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subtopic}</p>
                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: t.text, background: t.bg, border: `1px solid ${t.border}`, borderRadius: 999, padding: "3px 10px" }}>{item.subject}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Recent lessons ── */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
              <Clock size={14} color="#475569" /> Recent lessons
            </h3>
            <Link href="/learn/history" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#475569", textDecoration: "none" }}>
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div style={{ ...CARD }}>
            {recent.length === 0 ? (
              <div style={{ padding: "56px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BookOpen size={20} color="#334155" />
                </div>
                <p style={{ fontSize: 14, color: "#475569", margin: 0, fontWeight: 500 }}>No lessons yet</p>
                <p style={{ fontSize: 12, color: "#334155", margin: 0 }}>Generate your first one above</p>
              </div>
            ) : (
              <>
                {recent.map((l, i) => {
                  const t    = theme(l.subject);
                  const Icon = t.icon;
                  const d    = diff(l.difficulty);
                  const date = (l as any).updated_at ?? (l as any).updatedAt ?? "";
                  return (
                    <Link key={l.id} href={`/learn/${l.id}`} className="lesson-row"
                      style={{ position: "relative", display: "flex", alignItems: "center", gap: 16, padding: "16px 24px", textDecoration: "none", color: "#fff", borderBottom: i < recent.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", transition: "background .15s" }}>
                      <div style={{ position: "absolute", left: 0, top: 14, bottom: 14, width: 3, borderRadius: "0 3px 3px 0", background: t.hex, opacity: 0.7 }} />
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={17} color={t.text} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</p>
                        <p style={{ fontSize: 12, color: "#475569", margin: "3px 0 0" }}>{l.subject} · {ago(date)}</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: d.text, background: d.bg, border: `1px solid ${d.border}`, borderRadius: 999, padding: "4px 12px", flexShrink: 0 }}>{d.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#34d399", flexShrink: 0 }}>+{xp(l.difficulty)} XP</span>
                      <ChevronRight size={16} color="#334155" style={{ flexShrink: 0 }} />
                    </Link>
                  );
                })}
                <button style={{ width: "100%", padding: "14px 0", fontSize: 12, color: "#334155", background: "none", border: "none", borderTop: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#64748b")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#334155")}>
                  View full history
                </button>
              </>
            )}
          </div>
        </section>

        {error && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: "14px 20px" }}>
            <p style={{ fontSize: 13, color: "#f87171", margin: 0 }}>{error}</p>
            <button onClick={() => token && load(token)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#f87171", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
              <RotateCcw size={13} /> Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
