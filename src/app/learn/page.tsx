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

// ── Subject config ────────────────────────────────────────────────────────────

type SubjectConfig = {
  color: string;
  dimColor: string;
  bg: string;
  hex: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SUBJECT_CONFIG: Record<string, SubjectConfig> = {
  Mathematics:        { color: "text-violet-300",  dimColor: "text-violet-400",  bg: "bg-violet-500/20",  hex: "#7c3aed", icon: Calculator   },
  Physics:            { color: "text-blue-300",    dimColor: "text-blue-400",    bg: "bg-blue-500/20",    hex: "#3b82f6", icon: Zap          },
  Biology:            { color: "text-emerald-300", dimColor: "text-emerald-400", bg: "bg-emerald-500/20", hex: "#10b981", icon: Dna          },
  History:            { color: "text-amber-300",   dimColor: "text-amber-400",   bg: "bg-amber-500/20",   hex: "#f59e0b", icon: Globe        },
  Chemistry:          { color: "text-cyan-300",    dimColor: "text-cyan-400",    bg: "bg-cyan-500/20",    hex: "#06b6d4", icon: FlaskConical },
  Geography:          { color: "text-teal-300",    dimColor: "text-teal-400",    bg: "bg-teal-500/20",    hex: "#14b8a6", icon: Globe        },
  "Computer Science": { color: "text-indigo-300",  dimColor: "text-indigo-400",  bg: "bg-indigo-500/20",  hex: "#6366f1", icon: Code2        },
  Psychology:         { color: "text-pink-300",    dimColor: "text-pink-400",    bg: "bg-pink-500/20",    hex: "#ec4899", icon: Brain        },
  Economics:          { color: "text-green-300",   dimColor: "text-green-400",   bg: "bg-green-500/20",   hex: "#22c55e", icon: TrendingUp   },
  Languages:          { color: "text-rose-300",    dimColor: "text-rose-400",    bg: "bg-rose-500/20",    hex: "#f43f5e", icon: Languages    },
  Music:              { color: "text-purple-300",  dimColor: "text-purple-400",  bg: "bg-purple-500/20",  hex: "#a855f7", icon: Music        },
  Art:                { color: "text-orange-300",  dimColor: "text-orange-400",  bg: "bg-orange-500/20",  hex: "#f97316", icon: Palette      },
  default:            { color: "text-slate-300",   dimColor: "text-slate-400",   bg: "bg-slate-500/20",   hex: "#64748b", icon: BookOpen     },
};

function getSubjectConfig(name: string): SubjectConfig {
  return SUBJECT_CONFIG[name] ?? SUBJECT_CONFIG.default;
}

// ── Topic suggestions ─────────────────────────────────────────────────────────

const TOPIC_SUGGESTIONS: Record<string, { topic: string; subtopic: string }[]> = {
  Mathematics:        [{ topic: "Calculus",       subtopic: "Differentiation"      }, { topic: "Algebra",     subtopic: "Quadratic Equations" }, { topic: "Statistics",    subtopic: "Normal Distribution" }],
  Physics:            [{ topic: "Electricity",    subtopic: "Ohm's Law & Circuits" }, { topic: "Mechanics",   subtopic: "Newton's Laws"        }, { topic: "Waves",         subtopic: "Sound & Light"        }],
  Biology:            [{ topic: "Genetics",       subtopic: "DNA Structure"        }, { topic: "Cell Division", subtopic: "Mitosis & Meiosis"  }, { topic: "Ecology",       subtopic: "Food Chains"          }],
  History:            [{ topic: "World War II",   subtopic: "Causes & Events"      }, { topic: "Cold War",    subtopic: "USA vs USSR"          }],
  Chemistry:          [{ topic: "Chemical Bonds", subtopic: "Ionic & Covalent"     }, { topic: "Periodic Table", subtopic: "Element Groups"    }],
  Geography:          [{ topic: "Plate Tectonics", subtopic: "Earthquakes & Volcanoes" }],
  "Computer Science": [{ topic: "Algorithms",     subtopic: "Sorting & Searching"  }],
  Economics:          [{ topic: "Supply & Demand", subtopic: "Market Equilibrium"  }],
};

// ── Difficulty config ─────────────────────────────────────────────────────────

const DIFF_CONFIG: Record<string, { label: string; classes: string }> = {
  easy:   { label: "Guided",    classes: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25" },
  medium: { label: "Standard",  classes: "text-blue-400    bg-blue-500/10    border border-blue-500/25"    },
  hard:   { label: "Challenge", classes: "text-violet-400  bg-violet-500/10  border border-violet-500/25"  },
};

function getDiff(d: string) { return DIFF_CONFIG[d] ?? DIFF_CONFIG.medium; }
function xpForDiff(d: string) { return d === "hard" ? 30 : d === "medium" ? 25 : 20; }

function timeAgo(dateStr: string): string {
  if (!dateStr) return "Recently";
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LessonBlock { type: string; content: string; }
interface GeneratedLesson { title: string; blocks: LessonBlock[]; }

// ── Component ─────────────────────────────────────────────────────────────────

export default function LearnPageClient() {
  const router = useRouter();

  const [subjects, setSubjects] = useState<LearnSubject[]>([]);
  const [lessons, setLessons] = useState<LearnLesson[]>([]);
  const [summary, setSummary] = useState<LearnSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<GeneratedLesson | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setAccessToken(session.access_token);
      await fetchData(session.access_token);
    }
    init();
  }, []);

  async function fetchData(token: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/learn", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setSubjects(data.subjects ?? []);
      setLessons(data.lessons ?? []);
      setSummary(data.summary ?? null);
    } catch {
      setError("Couldn't load your lessons.");
    } finally {
      setLoading(false);
    }
  }

  async function generateLesson() {
    if (!selectedSubject || !topic.trim() || !accessToken) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ type: "lesson", subject: selectedSubject, topic: topic.trim() }),
      });
      const data = await res.json();
      if (data?.title && Array.isArray(data?.blocks)) {
        setGeneratedLesson(data);
      } else {
        setGenError("Couldn't generate the lesson. Try a different topic.");
      }
    } catch {
      setGenError("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const suggestedTopics = subjects
    .flatMap((s) => (TOPIC_SUGGESTIONS[s.name] ?? []).slice(0, 1).map((t) => ({ ...t, subject: s.name })))
    .slice(0, 6);

  const recentLessons = [...lessons]
    .sort((a, b) => {
      const aDate = (a as any).updated_at ?? (a as any).updatedAt ?? "";
      const bDate = (b as any).updated_at ?? (b as any).updatedAt ?? "";
      return bDate.localeCompare(aDate);
    })
    .slice(0, 4);

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070711] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" />
          </div>
          <p className="text-slate-600 text-sm">Loading your lessons…</p>
        </div>
      </div>
    );
  }

  // ── Generated lesson viewer ─────────────────────────────────────────────────

  if (generatedLesson) {
    return (
      <div className="min-h-screen bg-[#070711] text-white">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <button
            onClick={() => setGeneratedLesson(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-10 transition-colors group"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
            Back to Learn
          </button>

          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              AI Generated
            </span>
            <span className="text-slate-600 text-xs">·</span>
            <span className="text-slate-500 text-xs">{selectedSubject}</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-10 leading-snug">{generatedLesson.title}</h1>

          <div className="space-y-4">
            {generatedLesson.blocks.map((block, i) => {
              if (block.type === "tip") return (
                <div key={i} className="relative bg-amber-500/5 border border-amber-500/15 rounded-2xl p-5 pl-6 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50 rounded-l-2xl" />
                  <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-2">💡 Tip</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{block.content}</p>
                </div>
              );
              if (block.type === "example") return (
                <div key={i} className="relative bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-5 pl-6 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50 rounded-l-2xl" />
                  <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-2">Example</p>
                  <p className="text-slate-300 text-sm leading-relaxed font-mono">{block.content}</p>
                </div>
              );
              if (block.type === "math") return (
                <div key={i} className="relative bg-blue-500/5 border border-blue-500/15 rounded-2xl p-5 pl-6 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 rounded-l-2xl" />
                  <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-2">Formula</p>
                  <p className="text-slate-200 text-sm leading-relaxed font-mono">{block.content}</p>
                </div>
              );
              return <p key={i} className="text-slate-300 leading-[1.85] text-sm">{block.content}</p>;
            })}
          </div>

          <button
            onClick={() => setGeneratedLesson(null)}
            className="mt-12 w-full border border-white/6 hover:border-white/12 bg-white/2 hover:bg-white/4 rounded-2xl py-3.5 text-sm text-slate-400 hover:text-slate-200 transition-all"
          >
            ← Back to Learn
          </button>
        </div>
      </div>
    );
  }

  // ── Main page ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#070711] text-white">

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
          style={{ background: "radial-gradient(ellipse, rgba(109,40,217,0.12) 0%, transparent 65%)" }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-8 space-y-7">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/30 to-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">AI Learn</h1>
              <p className="text-slate-500 text-xs">Personalized lessons powered by AI</p>
            </div>
          </div>

          {summary && (
            <div className="flex items-center gap-2">
              {summary.currentStreak > 0 && (
                <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-orange-300 text-xs font-semibold">{summary.currentStreak}d</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 bg-[#13132a] border border-white/6 rounded-xl px-4 py-2.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <div>
                  <p className="text-white font-bold text-sm leading-none">{summary.currentXP.toLocaleString()} XP</p>
                  <p className="text-slate-600 text-[11px] mt-0.5">Level {summary.level}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Hero card ── */}
        <div
          className="relative rounded-2xl overflow-hidden border border-white/5"
          style={{ background: "radial-gradient(ellipse at 80% 30%, rgba(109,40,217,0.2) 0%, transparent 50%), radial-gradient(ellipse at 20% 85%, rgba(37,99,235,0.1) 0%, transparent 45%), #0f0f22" }}
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

          <div className="flex items-start gap-8 p-8">
            {/* Left: Form */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold mb-1">What will you learn today?</h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Choose a subject, enter a topic, and let AI build a lesson for you.
              </p>

              <div className="space-y-2.5">
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full bg-black/40 border border-white/8 hover:border-white/14 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/15 rounded-xl pl-10 pr-10 py-3 text-sm text-white appearance-none focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none rotate-90" />
                </div>

                <div className="relative">
                  <Wand2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Enter topic to learn..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && generateLesson()}
                    className="w-full bg-black/40 border border-white/8 hover:border-white/14 focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/15 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all"
                  />
                </div>

                <button
                  onClick={generateLesson}
                  disabled={!selectedSubject || !topic.trim() || generating}
                  className="relative w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 overflow-hidden transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                  style={{
                    background: "linear-gradient(135deg, #6d28d9, #4f46e5 50%, #2563eb)",
                    boxShadow: (!selectedSubject || !topic.trim() || generating) ? "none" : "0 0 28px rgba(109,40,217,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
                  }}
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating lesson…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Lesson
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {genError && <p className="text-red-400 text-xs text-center pt-1">{genError}</p>}
              </div>
            </div>

            {/* Right: Decorative icon grid (desktop only) */}
            <div className="hidden lg:grid grid-cols-2 gap-2.5 flex-shrink-0 self-center opacity-50">
              {[
                { icon: Atom,        color: "text-violet-400",  bg: "bg-violet-500/20"  },
                { icon: Brain,       color: "text-blue-400",    bg: "bg-blue-500/20"    },
                { icon: FlaskConical,color: "text-cyan-400",    bg: "bg-cyan-500/20"    },
                { icon: Calculator,  color: "text-emerald-400", bg: "bg-emerald-500/20" },
                { icon: Globe,       color: "text-amber-400",   bg: "bg-amber-500/20"   },
                { icon: Code2,       color: "text-indigo-400",  bg: "bg-indigo-500/20"  },
              ].map(({ icon: Icon, color, bg }, i) => (
                <div key={i} className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        </div>

        {/* ── Suggested topics ── */}
        {suggestedTopics.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                Suggested topics for you
              </h3>
              <Link href="/subjects" className="text-slate-500 text-xs hover:text-slate-300 flex items-center gap-1 transition-colors">
                View all subjects <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
              {suggestedTopics.map((item, i) => {
                const cfg = getSubjectConfig(item.subject);
                const Icon = cfg.icon;
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedSubject(item.subject); setTopic(item.topic); }}
                    className="flex-shrink-0 w-44 rounded-2xl p-4 text-left border border-white/5 hover:border-white/10 hover:-translate-y-0.5 transition-all group"
                    style={{ background: "linear-gradient(150deg, #141428 0%, #0f0f1c 100%)" }}
                  >
                    <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <p className="text-white font-semibold text-sm mb-0.5 truncate">{item.topic}</p>
                    <p className="text-slate-500 text-xs mb-3 truncate">{item.subtopic}</p>
                    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.dimColor}`}>
                      {item.subject}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Recent lessons ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Recent lessons
            </h3>
            <Link href="/learn/history" className="text-slate-500 text-xs hover:text-slate-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div
            className="rounded-2xl overflow-hidden border border-white/5"
            style={{ background: "linear-gradient(160deg, #111122 0%, #0c0c1a 100%)" }}
          >
            {recentLessons.length === 0 ? (
              <div className="py-14 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/4 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-slate-500 text-sm">No lessons yet</p>
                <p className="text-slate-600 text-xs">Generate your first one above</p>
              </div>
            ) : (
              <>
                {recentLessons.map((lesson, i) => {
                  const cfg = getSubjectConfig(lesson.subject);
                  const Icon = cfg.icon;
                  const diff = getDiff(lesson.difficulty);
                  const xp = xpForDiff(lesson.difficulty);
                  const updatedAt = (lesson as any).updated_at ?? (lesson as any).updatedAt ?? "";

                  return (
                    <Link
                      key={lesson.id}
                      href={`/learn/${lesson.id}`}
                      className={`relative flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors ${i < recentLessons.length - 1 ? "border-b border-white/4" : ""}`}
                    >
                      {/* Left color accent */}
                      <div
                        className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full opacity-50"
                        style={{ background: cfg.hex }}
                      />

                      <div className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{lesson.title}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{lesson.subject} · {timeAgo(updatedAt)}</p>
                      </div>

                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${diff.classes}`}>
                        {diff.label}
                      </span>

                      <span className="text-emerald-400 text-sm font-bold flex-shrink-0 tabular-nums">
                        +{xp} XP
                      </span>

                      <ChevronRight className="w-4 h-4 text-slate-700 flex-shrink-0" />
                    </Link>
                  );
                })}

                <button className="w-full py-3.5 text-slate-600 text-xs hover:text-slate-400 hover:bg-white/2 transition-colors border-t border-white/4">
                  View full history
                </button>
              </>
            )}
          </div>
        </section>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center justify-between gap-4 bg-red-500/5 border border-red-500/15 rounded-xl px-5 py-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => accessToken && fetchData(accessToken)}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm flex-shrink-0 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
