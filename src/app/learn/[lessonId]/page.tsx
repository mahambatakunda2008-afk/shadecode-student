"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Sparkles, BookOpen, Zap, Dna, Globe,
  FlaskConical, Calculator, Brain, Code2, TrendingUp,
  Languages, Music, Palette, CheckCircle2, Clock, Star,
} from "lucide-react";

// ── Themes ────────────────────────────────────────────────────────────────────

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

function xpForDiff(d: string) { return d === "hard" ? 50 : d === "medium" ? 35 : 20; }

interface LessonBlock { type: string; content: string; }

interface Lesson {
  id: string;
  title: string;
  subject: string;
  description: string;
  difficulty: string;
  progress: number;
  completed: boolean;
  blocks?: LessonBlock[];
  updated_at?: string;
}

// ── Block renderer ────────────────────────────────────────────────────────────

function BlockCard({ block }: { block: LessonBlock }) {
  const configs: Record<string, { label: string; emoji: string; bg: string; border: string; accent: string; textColor: string }> = {
    tip:     { label: "Tip",     emoji: "💡", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.2)",  accent: "#f59e0b", textColor: "#fcd34d" },
    example: { label: "Example", emoji: "📝", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)",  accent: "#10b981", textColor: "#6ee7b7" },
    math:    { label: "Formula", emoji: "∑",  bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.2)",  accent: "#3b82f6", textColor: "#93c5fd" },
  };

  const cfg = configs[block.type];

  if (cfg) return (
    <div style={{ position: "relative", background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 16, padding: "18px 20px 18px 24px", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: cfg.accent, borderRadius: "16px 0 0 16px" }} />
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: cfg.textColor, margin: "0 0 8px" }}>
        {cfg.emoji} {cfg.label}
      </p>
      <p style={{ fontSize: 14, lineHeight: 1.75, color: "#cbd5e1", margin: 0, fontFamily: block.type === "math" ? "monospace" : undefined }}>
        {block.content}
      </p>
    </div>
  );

  return <p style={{ fontSize: 14, lineHeight: 1.85, color: "#94a3b8", margin: 0 }}>{block.content}</p>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LessonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.lessonId as string;

  const [lesson,     setLesson]     = useState<Lesson | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setAccessToken(session.access_token);

      try {
        const r = await fetch(`/api/learn?lessonId=${lessonId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!r.ok) throw new Error();
        const d = await r.json();
        setLesson(d.lesson ?? null);
      } catch {
        setError("Couldn't load this lesson.");
      } finally {
        setLoading(false);
      }
    })();
  }, [lessonId]);

  async function markComplete() {
    if (!lesson || !accessToken || completing) return;
    setCompleting(true);
    try {
      const r = await fetch("/api/learn", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ lessonId: lesson.id, progress: 100 }),
      });
      if (!r.ok) throw new Error();
      // Update local state
      setLesson(prev => prev ? { ...prev, progress: 100, completed: true } : prev);
      setShowCelebration(true);
      // Hide celebration after 4s
      setTimeout(() => setShowCelebration(false), 4000);
    } catch {
      // Silently fail — UX still intact
    } finally {
      setCompleting(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#09091a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative", width: 36, height: 36 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.2)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#8b5cf6", animation: "spin 0.8s linear infinite" }} />
        </div>
        <p style={{ color: "#64748b", fontSize: 13 }}>Loading lesson…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Error ───────────────────────────────────────────────────────────────────

  if (error || !lesson) return (
    <div style={{ minHeight: "100vh", background: "#09091a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#f87171", fontSize: 14, marginBottom: 16 }}>{error ?? "Lesson not found."}</p>
        <Link href="/learn" style={{ color: "#a78bfa", fontSize: 13, textDecoration: "none" }}>← Back to Learn</Link>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const t         = theme(lesson.subject);
  const Icon      = t.icon;
  const d         = DIFF[lesson.difficulty] ?? DIFF.medium;
  const hasBlocks = Array.isArray(lesson.blocks) && lesson.blocks.length > 0;
  const earnedXP  = xpForDiff(lesson.difficulty);

  return (
    <div style={{ minHeight: "100vh", background: "#09091a", color: "#fff" }}>
      <style>{`
        @keyframes spin       { to { transform: rotate(360deg) } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes pop        { 0%,100% { transform: scale(1) } 50% { transform: scale(1.08) } }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden>
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: `radial-gradient(ellipse, ${t.hex}22 0%, transparent 65%)`, borderRadius: "50%" }} />
      </div>

      {/* ── Celebration toast ── */}
      {showCelebration && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 50, animation: "fadeSlideUp 0.35s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg, #052e16, #14532d)", border: "1px solid rgba(52,211,153,0.35)", borderRadius: 16, padding: "14px 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(52,211,153,0.15)" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pop 0.5s ease 0.2s" }}>
              <CheckCircle2 size={18} color="#34d399" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#f0fdf4", margin: 0 }}>Lesson Complete! 🎉</p>
              <p style={{ fontSize: 12, color: "#86efac", margin: "2px 0 0" }}>
                +{earnedXP} XP earned · Keep it up!
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 8, padding: "4px 10px", marginLeft: 4 }}>
              <Star size={12} color="#fbbf24" fill="#fbbf24" />
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fcd34d" }}>+{earnedXP} XP</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>

        {/* Back */}
        <Link href="/learn"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#475569", fontSize: 13, textDecoration: "none", marginBottom: 32 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
          onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
        >
          <ArrowLeft size={15} /> Back to Learn
        </Link>

        {/* ── Header card ── */}
        <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", background: `radial-gradient(ellipse at 90% 10%, ${t.hex}28 0%, transparent 55%), linear-gradient(160deg, #131330 0%, #0f0f24 100%)`, marginBottom: 32, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}>
          <div style={{ height: 3, background: `linear-gradient(90deg, ${t.hex}, ${t.hex}44)` }} />

          <div style={{ padding: "28px 32px" }}>
            {/* Subject + difficulty + completed badge */}
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={16} color={t.text} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{lesson.subject}</span>
              <span style={{ color: "#334155", fontSize: 12 }}>·</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: d.text, background: d.bg, border: `1px solid ${d.border}`, borderRadius: 999, padding: "3px 10px" }}>
                {d.label}
              </span>
              {lesson.completed && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#34d399", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 999, padding: "3px 10px" }}>
                  <CheckCircle2 size={12} /> Completed
                </span>
              )}
            </div>

            {/* Title */}
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", margin: "0 0 10px", lineHeight: 1.3 }}>{lesson.title}</h1>

            {/* Description */}
            {lesson.description && (
              <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px", lineHeight: 1.6 }}>{lesson.description}</p>
            )}

            {/* Progress bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#475569" }}>Progress</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: lesson.completed ? "#34d399" : t.text }}>{lesson.progress}%</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${lesson.progress}%`, background: lesson.completed ? "linear-gradient(90deg, #10b981, #34d399)" : `linear-gradient(90deg, ${t.hex}, ${t.hex}88)`, borderRadius: 999, transition: "width .8s ease" }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Lesson content ── */}
        {hasBlocks ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", padding: "4px 12px", borderRadius: 999 }}>
                <Sparkles size={11} /> AI Generated Lesson
              </span>
            </div>

            {lesson.blocks!.map((block, i) => (
              <BlockCard key={i} block={block} />
            ))}

            {/* ── Mark as Complete button ── */}
            <div style={{ marginTop: 16 }}>
              {lesson.completed ? (
                /* Already done — show a static success state */
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 24px", background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 16 }}>
                  <CheckCircle2 size={18} color="#34d399" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#34d399" }}>You completed this lesson</span>
                  <span style={{ fontSize: 12, color: "#065f46", background: "rgba(52,211,153,0.1)", borderRadius: 999, padding: "2px 10px" }}>+{earnedXP} XP earned</span>
                </div>
              ) : (
                /* Ready to complete */
                <button
                  onClick={markComplete}
                  disabled={completing}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px 24px", background: completing ? "rgba(52,211,153,0.06)" : "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(52,211,153,0.15))", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 16, cursor: completing ? "not-allowed" : "pointer", transition: "all .2s", color: "#34d399", fontSize: 15, fontWeight: 700 }}
                  onMouseEnter={e => { if (!completing) e.currentTarget.style.background = "linear-gradient(135deg, rgba(16,185,129,0.35), rgba(52,211,153,0.22))"; }}
                  onMouseLeave={e => { if (!completing) e.currentTarget.style.background = "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(52,211,153,0.15))"; }}
                >
                  {completing ? (
                    <>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(52,211,153,0.3)", borderTopColor: "#34d399", animation: "spin 0.8s linear infinite" }} />
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Mark as Complete · +{earnedXP} XP
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "56px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <BookOpen size={22} color="#334155" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#475569", margin: "0 0 6px" }}>No content yet</p>
            <p style={{ fontSize: 13, color: "#334155", margin: "0 0 24px" }}>This lesson was saved before content generation was supported.</p>
            <Link href="/learn" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#a78bfa", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10, padding: "10px 18px", textDecoration: "none" }}>
              Generate a new lesson
            </Link>
          </div>
        )}

        {/* Footer */}
        {lesson.updated_at && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 32, color: "#334155", fontSize: 12 }}>
            <Clock size={12} />
            Last updated {new Date(lesson.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}
      </div>
    </div>
  );
}
