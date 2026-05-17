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
  badgeColor: string;
  bg: string;
  hex: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SUBJECT_CONFIG: Record<string, SubjectConfig> = {
  Mathematics:        { color: "text-violet-300",  badgeColor: "text-violet-300",  bg: "bg-violet-500/20",  hex: "#7c3aed", icon: Calculator   },
  Physics:            { color: "text-blue-300",    badgeColor: "text-blue-300",    bg: "bg-blue-500/20",    hex: "#3b82f6", icon: Zap          },
  Biology:            { color: "text-emerald-300", badgeColor: "text-emerald-300", bg: "bg-emerald-500/20", hex: "#10b981", icon: Dna          },
  History:            { color: "text-amber-300",   badgeColor: "text-amber-300",   bg: "bg-amber-500/20",   hex: "#f59e0b", icon: Globe        },
  Chemistry:          { color: "text-cyan-300",    badgeColor: "text-cyan-300",    bg: "bg-cyan-500/20",    hex: "#06b6d4", icon: FlaskConical },
  Geography:          { color: "text-teal-300",    badgeColor: "text-teal-300",    bg: "bg-teal-500/20",    hex: "#14b8a6", icon: Globe        },
  "Computer Science": { color: "text-indigo-300",  badgeColor: "text-indigo-300",  bg: "bg-indigo-500/20",  hex: "#6366f1", icon: Code2        },
  Psychology:         { color: "text-pink-300",    badgeColor: "text-pink-300",    bg: "bg-pink-500/20",    hex: "#ec4899", icon: Brain        },
  Economics:          { color: "text-green-300",   badgeColor: "text-green-300",   bg: "bg-green-500/20",   hex: "#22c55e", icon: TrendingUp   },
  Languages:          { color: "text-rose-300",    badgeColor: "text-rose-300",    bg: "bg-rose-500/20",    hex: "#f43f5e", icon: Languages    },
  Music:              { color: "text-purple-300",  badgeColor: "text-purple-300",  bg: "bg-purple-500/20",  hex: "#a855f7", icon: Music        },
  Art:                { color: "text-orange-300",  badgeColor: "text-orange-300",  bg: "bg-orange-500/20",  hex: "#f97316", icon: Palette      },
  default:            { color: "text-slate-300",   badgeColor: "text-slate-400",   bg: "bg-slate-500/20",   hex: "#64748b", icon: BookOpen     },
};

function getSubjectConfig(name: string): SubjectConfig {
  return SUBJECT_CONFIG[name] ?? SUBJECT_CONFIG.default;
}

// ── Topic suggestions ─────────────────────────────────────────────────────────

const TOPIC_SUGGESTIONS: Record<string, { topic: string; subtopic: string }[]> = {
  Mathematics:        [{ topic: "Calculus",        subtopic: "Differentiation"       }, { topic: "Algebra",      subtopic: "Quadratic Equations" }],
  Physics:            [{ topic: "Electricity",     subtopic: "Ohm's Law & Circuits"  }, { topic: "Mechanics",    subtopic: "Newton's Laws"       }],
  Biology:            [{ topic: "Genetics",        subtopic: "DNA Structure"         }, { topic: "Cell Division",subtopic: "Mitosis & Meiosis"   }],
  History:            [{ topic: "World War II",    subtopic: "Causes & Events"       }, { topic: "Cold War",     subtopic: "USA vs USSR"         }],
  Chemistry:          [{ topic: "Chemical Bonds",  subtopic: "Ionic & Covalent"      }, { topic: "Periodic Table",subtopic: "Element Groups"     }],
  Geography:          [{ topic: "Plate Tectonics", subtopic: "Earthquakes & Volcanoes"}],
  "Computer Science": [{ topic: "Algorithms",      subtopic: "Sorting & Searching"   }],
  Economics:          [{ topic: "Supply & Demand", subtopic: "Market Equilibrium"    }],
  Psychology:         [{ topic: "Memory",          subtopic: "Storage & Retrieval"   }],
};

// ── Difficulty config ─────────────────────────────────────────────────────────

const DIFF: Record<string, { label: string; cls: string }> = {
  easy:   { label: "Guided",    cls: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25" },
  medium: { label: "Standard",  cls: "text-blue-400    bg-blue-500/10    border border-blue-500/25"    },
  hard:   { label: "Challenge", cls: "text-violet-400  bg-violet-500/10  border border-violet-500/25"  },
};

function getDiff(d: string) { return DIFF[d] ?? DIFF.medium; }
function xpForDiff(d: string) { return d === "hard" ? 30 : d === "medium" ? 25 : 20; }

function timeAgo(dateStr: string): string {
  if (!dateStr) return "Recently";
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LessonBlock { type: string; content: string; }
interface GeneratedLesson { title: string; blocks: LessonBlock[]; }

// ── Component ─────────────────────────────────────────────────────────────────

export default function LearnPageClient() {
  const router = useRouter();

  const [subjects, setSubjects]   = useState<LearnSubject[]>([]);
  const [lessons, setLessons]     = useState<LearnLesson[]>([]);
  const [summary, setSummary]     = useState<LearnSummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [accessToken, setToken]   = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic]         = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<GeneratedLesson | null>(null);
  const [genError, setGenError]   = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setToken(session.access_token);
      await fetchData(session.access_token);
    }
    init();
  }, []);

  async function fetchData(token: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/learn", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
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
      if (data?.title && Array.isArray(data?.blocks)) setGeneratedLesson(data);
      else setGenError("Couldn't generate the lesson. Try a different topic.");
    } catch {
      setGenError("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const suggestedTopics = subjects
    .flatMap((s) => (TOPIC_SUGGESTIONS[s.name] ?? []).slice(0, 1).map((t) => ({ ...t, subject: s.name })))
    .slice(0, 5);

  const recentLessons = [...lessons]
    .sort((a, b) => {
      const aDate = (a as any).updated_at ?? "";
      const bDate = (b as any).updated_at ?? "";
      return bDate.localeCompare(aDate);
    })
    .slice(0, 4);

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a18] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-9 h-9">
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-400 animate-spin" />
        </div>
        <p className="text-slate-600 text-sm">Loading…</p>
      </div>
    </div>
  );

  // ── Lesson viewer ───────────────────────────────────────────────────────────

  if (generatedLesson) return (
    <div className="min-h-screen bg-[#0a0a18] text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <button
          onClick={() => setGeneratedLesson(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-10 transition-colors group"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
          Back to Learn
        </button>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest uppercase text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full mb-4">
          <Sparkles className="w-3 h-3" /> AI Generated · {selectedSubject}
        </span>

        <h1 className="text-2xl font-bold text-white mt-3 mb-8 leading-snug">{generatedLesson.title}</h1>

        <div className="space-y-4">
          {generatedLesson.blocks.map((block, i) => {
            const base = "relative rounded-2xl p-5 pl-6 overflow-hidden border";
            if (block.type === "tip") return (
              <div key={i} className={`${base} bg-amber-500/5 border-amber-500/15`}>
                <div className="absolute top-0 left-0 w-[3px] h-full bg-amber-500/60 rounded-l-2xl" />
                <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-2">💡 Tip</p>
                <p className="text-slate-300 text-sm leading-relaxed">{block.content}</p>
              </div>
            );
            if (block.type === "example") return (
              <div key={i} className={`${base} bg-emerald-500/5 border-emerald-500/15`}>
                <div className="absolute top-0 left-0 w-[3px] h-full bg-emerald-500/60 rounded-l-2xl" />
                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-2">Example</p>
                <p className="text-slate-300 text-sm leading-relaxed font-mono">{block.content}</p>
              </div>
            );
            if (block.type === "math") return (
              <div key={i} className={`${base} bg-blue-500/5 border-blue-500/15`}>
                <div className="absolute top-0 left-0 w-[3px] h-full bg-blue-500/60 rounded-l-2xl" />
                <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-2">Formula</p>
                <p className="text-slate-200 text-sm leading-relaxed font-mono">{block.content}</p>
              </div>
            );
            return <p key={i} className="text-slate-300 leading-[1.85] text-sm">{block.content}</p>;
          })}
        </div>

        <button
          onClick={() => setGeneratedLesson(null)}
          className="mt-10 w-full border border-white/8 hover:border-white/14 bg-white/3 hover:bg-white/5 rounded-2xl py-3.5 text-sm text-slate-400 hover:text-slate-200 transition-all"
        >
          ← Back to Learn
        </button>
      </div>
    </div>
  );

  // ── Main page ───────────────────────────────────────────────────────────────

  const inputCls =
    "w-full bg-[#0d0d20] border border-[#2a2a45] hover:border-[#3a3a5c] focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/15 rounded-xl py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-all";

  return (
    <div className="min-h-screen bg-[#0a0a18] text-white">

      {/* Page-level ambient glow */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, #6d28d9 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Icon badge */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.35), rgba(109,40,217,0.1))", border: "1px solid rgba(109,40,217,0.35)" }}>
              <Sparkles className="w-4.5 h-4.5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none">AI Learn</h1>
              <p className="text-slate-500 text-xs mt-1">Personalized lessons powered by AI</p>
            </div>
          </div>

          {summary && (
            <div className="flex items-center gap-2">
              {summary.currentStreak > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border"
                  style={{ background: "rgba(249,115,22,0.08)", borderColor: "rgba(249,115,22,0.2)" }}>
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-orange-300 text-xs font-bold">{summary.currentStreak}d</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border"
                style={{ background: "#111128", borderColor: "#2a2a45" }}>
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <div>
                  <p className="text-white font-bold text-sm leading-none">{summary.currentXP.toLocaleString()} XP</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">Level {summary.level}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Hero card ── */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 85% 20%, rgba(109,40,217,0.22) 0%, transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(37,99,235,0.12) 0%, transparent 50%), linear-gradient(160deg, #131330 0%, #0e0e24 50%, #0c0c1e 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* Top shimmer */}
          <div className="absolute top-0 inset-x-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)" }} />

          <div className="p-8">
            <div className="flex items-start gap-10">

              {/* Left: form — takes full width, right side is decorative overlay */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold mb-2">What will you learn today?</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-7">
                  Choose a subject, enter a topic, and let AI create a personalized lesson for you.
                </p>

                <div className="space-y-3">
                  {/* Subject */}
                  <div className="relative">
                    <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className={`${inputCls} pl-10 pr-10 appearance-none cursor-pointer`}
                    >
                      <option value="" disabled>Select subject</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none rotate-90" />
                  </div>

                  {/* Topic */}
                  <div className="relative">
                    <Wand2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Enter topic to learn..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && generateLesson()}
                      className={`${inputCls} pl-10 pr-4`}
                    />
                  </div>

                  {/* Button */}
                  <button
                    onClick={generateLesson}
                    disabled={!selectedSubject || !topic.trim() || generating}
                    className="relative w-full rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                    style={{
                      background: "linear-gradient(135deg, #6d28d9 0%, #5046e4 50%, #2563eb 100%)",
                      boxShadow: (!selectedSubject || !topic.trim() || generating)
                        ? "none"
                        : "0 0 24px rgba(109,40,217,0.45), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.18)",
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

                  {genError && <p className="text-red-400 text-xs text-center">{genError}</p>}
                </div>
              </div>

              {/* Right: floating icon grid — hidden on small viewports */}
              <div className="hidden xl:block flex-shrink-0 self-center">
                <div className="grid grid-cols-2 gap-3 opacity-40">
                  {[
                    { I: Atom,         c: "text-violet-400",  b: "rgba(109,40,217,0.25)"  },
                    { I: Brain,        c: "text-blue-400",    b: "rgba(59,130,246,0.25)"  },
                    { I: FlaskConical, c: "text-cyan-400",    b: "rgba(6,182,212,0.25)"   },
                    { I: Calculator,   c: "text-emerald-400", b: "rgba(16,185,129,0.25)"  },
                    { I: Globe,        c: "text-amber-400",   b: "rgba(245,158,11,0.25)"  },
                    { I: Code2,        c: "text-indigo-400",  b: "rgba(99,102,241,0.25)"  },
                  ].map(({ I, c, b }, i) => (
                    <div key={i} className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: b, border: "1px solid rgba(255,255,255,0.06)" }}>
                      <I className={`w-5 h-5 ${c}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom shimmer */}
          <div className="absolute bottom-0 inset-x-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.25), transparent)" }} />
        </div>

        {/* ── Suggested topics ── */}
        {suggestedTopics.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                Suggested topics for you
              </h3>
              <Link href="/subjects"
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                style={{ textDecoration: "none" }}>
                View all subjects <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Scrollable row */}
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-6 px-6 [scrollbar-width:none]">
              {suggestedTopics.map((item, i) => {
                const cfg = getSubjectConfig(item.subject);
                const Icon = cfg.icon;
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedSubject(item.subject); setTopic(item.topic); }}
                    className="flex-shrink-0 w-52 rounded-2xl p-5 text-left transition-all duration-200 hover:-translate-y-0.5 group"
                    style={{
                      background: "linear-gradient(145deg, #141430 0%, #0f0f24 100%)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    {/* Icon */}
                    <div className={`w-11 h-11 ${cfg.bg} rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-105`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>

                    {/* Text */}
                    <p className="text-white font-bold text-sm mb-0.5 truncate">{item.topic}</p>
                    <p className="text-slate-500 text-xs mb-4 truncate">{item.subtopic}</p>

                    {/* Subject badge */}
                    <span
                      className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.badgeColor}`}
                    >
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
            <Link href="/learn/history"
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              style={{ textDecoration: "none" }}>
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #111128 0%, #0d0d1e 100%)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {recentLessons.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <BookOpen className="w-5 h-5 text-slate-600" />
                </div>
                <p className="text-slate-400 text-sm font-medium">No lessons yet</p>
                <p className="text-slate-600 text-xs">Generate your first one above</p>
              </div>
            ) : (
              <>
                {recentLessons.map((lesson, i) => {
                  const cfg  = getSubjectConfig(lesson.subject);
                  const Icon = cfg.icon;
                  const diff = getDiff(lesson.difficulty);
                  const xp   = xpForDiff(lesson.difficulty);
                  const date = (lesson as any).updated_at ?? (lesson as any).updatedAt ?? "";

                  return (
                    <Link
                      key={lesson.id}
                      href={`/learn/${lesson.id}`}
                      className="relative flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition-colors"
                      style={i < recentLessons.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.05)" } : {}}
                    >
                      {/* Left colour bar */}
                      <div className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-full opacity-60"
                        style={{ background: cfg.hex }} />

                      {/* Subject icon */}
                      <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
                      </div>

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{lesson.title}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{lesson.subject} · {timeAgo(date)}</p>
                      </div>

                      {/* Difficulty badge */}
                      <span className={`text-[11px] font-semibold px-3 py-1 rounded-full flex-shrink-0 ${diff.cls}`}>
                        {diff.label}
                      </span>

                      {/* XP */}
                      <span className="text-emerald-400 text-sm font-bold tabular-nums flex-shrink-0">
                        +{xp} XP
                      </span>

                      <ChevronRight className="w-4 h-4 text-slate-700 flex-shrink-0" />
                    </Link>
                  );
                })}

                <button
                  className="w-full py-4 text-xs text-slate-600 hover:text-slate-400 hover:bg-white/2 transition-colors"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                  View full history
                </button>
              </>
            )}
          </div>
        </section>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center justify-between gap-4 rounded-xl px-5 py-4"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}>
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
