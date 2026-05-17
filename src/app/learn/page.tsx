"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  Star,
  Clock,
  ChevronRight,
  BookOpen,
  Zap,
  Dna,
  Globe,
  FlaskConical,
  Calculator,
  Wand2,
  ArrowRight,
  RotateCcw,
  Brain,
  Atom,
  Languages,
  Music,
  Palette,
  Code2,
  TrendingUp,
} from "lucide-react";
import type { LearnLesson, LearnSubject, LearnSummary } from "./types";

// ── Subject config ────────────────────────────────────────────────────────────

type SubjectConfig = {
  color: string;
  bg: string;
  border: string;
  icon: React.ComponentType<{ className?: string }>;
};

const SUBJECT_CONFIG: Record<string, SubjectConfig> = {
  Mathematics: {
    color: "text-purple-400",
    bg: "bg-purple-500/15",
    border: "border-purple-500/20",
    icon: Calculator,
  },
  Physics: {
    color: "text-blue-400",
    bg: "bg-blue-500/15",
    border: "border-blue-500/20",
    icon: Zap,
  },
  Biology: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/20",
    icon: Dna,
  },
  History: {
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/20",
    icon: Globe,
  },
  Chemistry: {
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/20",
    icon: FlaskConical,
  },
  Geography: {
    color: "text-teal-400",
    bg: "bg-teal-500/15",
    border: "border-teal-500/20",
    icon: Globe,
  },
  "Computer Science": {
    color: "text-indigo-400",
    bg: "bg-indigo-500/15",
    border: "border-indigo-500/20",
    icon: Code2,
  },
  Psychology: {
    color: "text-pink-400",
    bg: "bg-pink-500/15",
    border: "border-pink-500/20",
    icon: Brain,
  },
  Economics: {
    color: "text-green-400",
    bg: "bg-green-500/15",
    border: "border-green-500/20",
    icon: TrendingUp,
  },
  Languages: {
    color: "text-rose-400",
    bg: "bg-rose-500/15",
    border: "border-rose-500/20",
    icon: Languages,
  },
  Music: {
    color: "text-violet-400",
    bg: "bg-violet-500/15",
    border: "border-violet-500/20",
    icon: Music,
  },
  Art: {
    color: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/20",
    icon: Palette,
  },
  default: {
    color: "text-slate-400",
    bg: "bg-slate-500/15",
    border: "border-slate-500/20",
    icon: BookOpen,
  },
};

function getSubjectConfig(name: string): SubjectConfig {
  return SUBJECT_CONFIG[name] ?? SUBJECT_CONFIG.default;
}

// ── Topic suggestions per subject ─────────────────────────────────────────────

const TOPIC_SUGGESTIONS: Record<string, { topic: string; subtopic: string }[]> =
  {
    Mathematics: [
      { topic: "Calculus", subtopic: "Differentiation" },
      { topic: "Algebra", subtopic: "Quadratic Equations" },
      { topic: "Statistics", subtopic: "Normal Distribution" },
      { topic: "Trigonometry", subtopic: "Sin, Cos & Tan" },
    ],
    Physics: [
      { topic: "Electricity", subtopic: "Ohm's Law & Circuits" },
      { topic: "Mechanics", subtopic: "Newton's Laws" },
      { topic: "Waves", subtopic: "Sound & Light" },
      { topic: "Thermodynamics", subtopic: "Heat Transfer" },
    ],
    Biology: [
      { topic: "Genetics", subtopic: "DNA Structure" },
      { topic: "Cell Division", subtopic: "Mitosis & Meiosis" },
      { topic: "Ecology", subtopic: "Food Chains" },
      { topic: "Evolution", subtopic: "Natural Selection" },
    ],
    History: [
      { topic: "World War II", subtopic: "Causes & Events" },
      { topic: "Cold War", subtopic: "USA vs USSR" },
      { topic: "Industrial Revolution", subtopic: "Britain 1760–1840" },
      { topic: "Colonialism", subtopic: "Africa & Asia" },
    ],
    Chemistry: [
      { topic: "Chemical Bonds", subtopic: "Ionic & Covalent" },
      { topic: "Periodic Table", subtopic: "Element Groups" },
      { topic: "Organic Chemistry", subtopic: "Hydrocarbons" },
      { topic: "Acids & Bases", subtopic: "pH & Reactions" },
    ],
    Geography: [
      { topic: "Plate Tectonics", subtopic: "Earthquakes & Volcanoes" },
      { topic: "Climate Change", subtopic: "Causes & Effects" },
      { topic: "Urbanisation", subtopic: "Push & Pull Factors" },
    ],
    "Computer Science": [
      { topic: "Algorithms", subtopic: "Sorting & Searching" },
      { topic: "Databases", subtopic: "SQL & Relationships" },
      { topic: "Networks", subtopic: "TCP/IP & Protocols" },
    ],
    Economics: [
      { topic: "Supply & Demand", subtopic: "Market Equilibrium" },
      { topic: "Inflation", subtopic: "Causes & Effects" },
      { topic: "Fiscal Policy", subtopic: "Government Spending" },
    ],
  };

// ── Difficulty display config ─────────────────────────────────────────────────

const DIFF_CONFIG: Record<
  string,
  { label: string; classes: string }
> = {
  easy: {
    label: "Guided",
    classes:
      "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25",
  },
  medium: {
    label: "Standard",
    classes: "text-blue-400 bg-blue-500/10 border border-blue-500/25",
  },
  hard: {
    label: "Challenge",
    classes:
      "text-purple-400 bg-purple-500/10 border border-purple-500/25",
  },
};

function getDiff(difficulty: string) {
  return DIFF_CONFIG[difficulty] ?? DIFF_CONFIG.medium;
}

function xpForDifficulty(difficulty: string) {
  return difficulty === "hard" ? 30 : difficulty === "medium" ? 25 : 20;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "Recently";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diffMs / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

// ── Generated lesson types ────────────────────────────────────────────────────

interface LessonBlock {
  type: "text" | "example" | "math" | "tip" | string;
  content: string;
}

interface GeneratedLesson {
  title: string;
  blocks: LessonBlock[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LearnPageClient() {
  const router = useRouter();

  const [subjects, setSubjects] = useState<LearnSubject[]>([]);
  const [lessons, setLessons] = useState<LearnLesson[]>([]);
  const [summary, setSummary] = useState<LearnSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Generation state
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedLesson, setGeneratedLesson] = useState<GeneratedLesson | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setAccessToken(session.access_token);
      await fetchData(session.access_token);
    }
    init();
  }, []);

  async function fetchData(token: string) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/learn", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setSubjects(data.subjects ?? []);
      setLessons(data.lessons ?? []);
      setSummary(data.summary ?? null);
    } catch {
      setError("Couldn't load your lessons. Check your connection and try again.");
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          type: "lesson",
          subject: selectedSubject,
          topic: topic.trim(),
        }),
      });
      const data = await res.json();
      if (data?.title && Array.isArray(data?.blocks)) {
        setGeneratedLesson(data);
      } else {
        setGenError("AI couldn't generate the lesson. Try a different topic.");
      }
    } catch {
      setGenError("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  // Build suggested topic cards from user's subjects
  const suggestedTopics = subjects
    .flatMap((s) =>
      (TOPIC_SUGGESTIONS[s.name] ?? [])
        .slice(0, 1)
        .map((t) => ({ ...t, subject: s.name }))
    )
    .slice(0, 5);

  const recentLessons = [...lessons]
    .sort((a, b) => {
      const aDate = (a as any).updated_at ?? (a as any).updatedAt ?? "";
      const bDate = (b as any).updated_at ?? (b as any).updatedAt ?? "";
      return bDate.localeCompare(aDate);
    })
    .slice(0, 4);

  // ── Loading screen ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-9 h-9 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">Loading your lessons…</p>
        </div>
      </div>
    );
  }

  // ── Generated lesson viewer ─────────────────────────────────────────────────

  if (generatedLesson) {
    return (
      <div className="min-h-screen bg-[#0b0b16] text-white px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setGeneratedLesson(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors"
          >
            ← Back to Learn
          </button>

          <div className="flex items-center gap-2 text-violet-400 text-xs font-semibold uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            AI Generated · {selectedSubject}
          </div>
          <h1 className="text-2xl font-bold text-white mb-8">
            {generatedLesson.title}
          </h1>

          <div className="space-y-5">
            {generatedLesson.blocks.map((block, i) => {
              if (block.type === "tip") {
                return (
                  <div
                    key={i}
                    className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4"
                  >
                    <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                      💡 Tip
                    </p>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {block.content}
                    </p>
                  </div>
                );
              }
              if (block.type === "example") {
                return (
                  <div
                    key={i}
                    className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4"
                  >
                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                      Example
                    </p>
                    <p className="text-slate-300 text-sm leading-relaxed font-mono">
                      {block.content}
                    </p>
                  </div>
                );
              }
              if (block.type === "math") {
                return (
                  <div
                    key={i}
                    className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-4"
                  >
                    <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                      Math
                    </p>
                    <p className="text-slate-200 text-sm leading-relaxed font-mono">
                      {block.content}
                    </p>
                  </div>
                );
              }
              return (
                <p key={i} className="text-slate-300 leading-relaxed text-sm">
                  {block.content}
                </p>
              );
            })}
          </div>

          <button
            onClick={() => setGeneratedLesson(null)}
            className="mt-10 w-full border border-white/10 hover:border-white/20 rounded-xl py-3 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Back to Learn
          </button>
        </div>
      </div>
    );
  }

  // ── Main page ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0b0b16] text-white">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-violet-400" />
              AI Learn
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Personalized lessons powered by AI
            </p>
          </div>

          {summary && (
            <div className="bg-[#1a1a2e] border border-white/8 rounded-2xl px-4 py-2.5 flex items-center gap-3">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
              <div>
                <p className="text-white font-semibold text-sm leading-none">
                  {summary.currentXP.toLocaleString()} XP
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  Level {summary.level}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Hero card ── */}
        <div className="relative bg-gradient-to-br from-[#171728] to-[#12121f] rounded-2xl p-8 border border-white/5 overflow-hidden">
          {/* Glow */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />

          {/* Decorative icon cluster */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-3 opacity-25 pointer-events-none select-none">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
                <Atom className="w-5 h-5 text-violet-400" />
              </div>
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Brain className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div className="flex gap-3 ml-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </div>

          <div className="relative max-w-md">
            <h2 className="text-xl font-bold mb-1.5">
              What will you learn today?
            </h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Choose a subject, enter a topic, and let AI create a personalized
              lesson for you.
            </p>

            <div className="space-y-3">
              {/* Subject dropdown */}
              <div className="relative">
                <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-[#0b0b16] border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-violet-500/60 transition-colors cursor-pointer"
                >
                  <option value="" disabled>
                    Select subject
                  </option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none rotate-90" />
              </div>

              {/* Topic input */}
              <div className="relative">
                <Wand2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Enter topic to learn..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && generateLesson()}
                  className="w-full bg-[#0b0b16] border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                />
              </div>

              {/* Generate button */}
              <button
                onClick={generateLesson}
                disabled={!selectedSubject || !topic.trim() || generating}
                className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
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

              {genError && (
                <p className="text-red-400 text-xs text-center">{genError}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Suggested topics ── */}
        {suggestedTopics.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                Suggested topics for you
              </h3>
              <Link
                href="/subjects"
                className="text-slate-500 text-xs hover:text-white flex items-center gap-1 transition-colors"
              >
                View all subjects
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
              {suggestedTopics.map((item, i) => {
                const cfg = getSubjectConfig(item.subject);
                const Icon = cfg.icon;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedSubject(item.subject);
                      setTopic(item.topic);
                    }}
                    className="flex-shrink-0 w-44 bg-[#141424] hover:bg-[#1a1a30] border border-white/5 hover:border-white/10 rounded-2xl p-4 text-left transition-all group"
                  >
                    <div
                      className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center mb-3`}
                    >
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <p className="text-white font-semibold text-sm mb-0.5 truncate">
                      {item.topic}
                    </p>
                    <p className="text-slate-500 text-xs mb-3 truncate">
                      {item.subtopic}
                    </p>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
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
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Recent lessons
            </h3>
            <Link
              href="/learn/history"
              className="text-slate-500 text-xs hover:text-white flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-[#141424] border border-white/5 rounded-2xl overflow-hidden">
            {recentLessons.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2 text-slate-500">
                <BookOpen className="w-8 h-8 opacity-40" />
                <p className="text-sm">No lessons yet.</p>
                <p className="text-xs">Generate your first one above!</p>
              </div>
            ) : (
              <>
                {recentLessons.map((lesson, i) => {
                  const cfg = getSubjectConfig(lesson.subject);
                  const Icon = cfg.icon;
                  const diff = getDiff(lesson.difficulty);
                  const xp = xpForDifficulty(lesson.difficulty);
                  const updatedAt =
                    (lesson as any).updated_at ??
                    (lesson as any).updatedAt ??
                    "";

                  return (
                    <Link
                      key={lesson.id}
                      href={`/learn/${lesson.id}`}
                      className={`flex items-center gap-4 px-5 py-4 hover:bg-white/4 transition-colors ${
                        i < recentLessons.length - 1
                          ? "border-b border-white/5"
                          : ""
                      }`}
                    >
                      {/* Subject icon */}
                      <div
                        className={`w-9 h-9 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {lesson.title}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {lesson.subject} · {timeAgo(updatedAt)}
                        </p>
                      </div>

                      {/* Difficulty badge */}
                      <span
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${diff.classes}`}
                      >
                        {diff.label}
                      </span>

                      {/* XP */}
                      <span className="text-emerald-400 text-sm font-semibold flex-shrink-0">
                        +{xp} XP
                      </span>

                      <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    </Link>
                  );
                })}

                <button className="w-full py-3.5 text-slate-500 text-xs hover:text-slate-300 hover:bg-white/4 transition-colors border-t border-white/5">
                  View full history
                </button>
              </>
            )}
          </div>
        </section>

        {/* ── Error banner ── */}
        {error && (
          <div className="bg-red-500/8 border border-red-500/20 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => accessToken && fetchData(accessToken)}
              className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1.5 flex-shrink-0 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
