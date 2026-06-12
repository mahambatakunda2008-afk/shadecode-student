"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Sparkles, BookOpen, Zap, Dna, Globe,
  FlaskConical, Calculator, Brain, Code2, TrendingUp,
  Languages, Music, Palette, CheckCircle2, Clock,
  HelpCircle, ArrowRight, MessageSquare, Download,
} from "lucide-react";
import SocraticTutor from "@/components/SocraticTutor";
import { downloadManager } from "@/lib/offline/downloadManager";

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

function theme(name: string): SubjectTheme { return THEMES[name] ?? THEMES.default; }

const DIFF: Record<string, { label: string; bg: string; border: string; text: string }> = {
  easy:   { label: "Guided",    bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  text: "#6ee7b7" },
  medium: { label: "Standard",  bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)",  text: "#93c5fd" },
  hard:   { label: "Challenge", bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.3)",  text: "#c4b5fd" },
};

interface LessonBlock { type: string; content: string; }
interface Lesson {
  id: string; title: string; subject: string; description: string;
  difficulty: string; progress: number; completed: boolean;
  blocks?: LessonBlock[]; updated_at?: string;
}

function BlockCard({ block }: { block: LessonBlock }) {
  const cfg: Record<string, { label: string; emoji: string; bg: string; border: string; accent: string; textColor: string }> = {
    tip:     { label: "Tip",     emoji: "💡", bg: "rgba(245,158,11,0.06)",  border: "rgba(245,158,11,0.2)",  accent: "#f59e0b", textColor: "#fcd34d" },
    example: { label: "Example", emoji: "📝", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.2)",  accent: "#10b981", textColor: "#6ee7b7" },
    math:    { label: "Formula", emoji: "∑",  bg: "rgba(59,130,246,0.06)",  border: "rgba(59,130,246,0.2)",  accent: "#3b82f6", textColor: "#93c5fd" },
  };
  const c = cfg[block.type];
  if (c) return (
    <div style={{ position: "relative", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, padding: "18px 20px 18px 24px", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: c.accent, borderRadius: "16px 0 0 16px" }} />
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: c.textColor, margin: "0 0 8px" }}>{c.emoji} {c.label}</p>
      <p style={{ fontSize: 14, lineHeight: 1.75, color: "#cbd5e1", margin: 0, fontFamily: block.type === "math" ? "monospace" : undefined }}>{block.content}</p>
    </div>
  );
  return <p style={{ fontSize: 14, lineHeight: 1.85, color: "#94a3b8", margin: 0 }}>{block.content}</p>;
}

function xpForDiff(d: string) { return d === "hard" ? 50 : d === "medium" ? 35 : 20; }

export default function LessonDetailPage() {
  const router   = useRouter();
  const params   = useParams();
  const lessonId = params?.lessonId as string;

  const [lesson,       setLesson]       = useState<Lesson | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [completing,   setCompleting]   = useState(false);
  const [showToast,    setShowToast]    = useState(false);
  const [accessToken,  setAccessToken]  = useState<string | null>(null);
  const [showTutor,    setShowTutor]    = useState(false);
  const [currentUser,  setCurrentUser]  = useState<string>("");
  const [downloading,  setDownloading]  = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { router.push("/login"); return; }
      setAccessToken(session.access_token);
      setCurrentUser(session.user.id);
      try {
        const r = await fetch(`/api/learn?lessonId=${lessonId}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!r.ok) throw new Error();
        const d = await r.json();
        setLesson(d.lesson ?? null);
      } catch { setError("Couldn't load this lesson."); }
      finally   { setLoading(false); }
    })();
  }, [lessonId]);

  // Sync offline progress when online
  useEffect(() => {
    const handleOnline = async () => {
      if (currentUser) {
        try {
          await downloadManager.syncProgress(currentUser);
        } catch (error) {
          console.error("Failed to sync progress:", error);
        }
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [currentUser]);

  async function handleDownload() {
    if (!lesson || downloading) return;

    setDownloading(true);
    setDownloadProgress(0);

    try {
      await downloadManager.downloadAll(
        lesson.id,
        lesson,
        undefined, // notes - can be added later
        undefined, // quiz - can be added later
        (progress) => setDownloadProgress(progress)
      );

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  }

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
      setLesson(prev => prev ? { ...prev, progress: 100, completed: true } : prev);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch {} finally { setCompleting(false); }
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#09091a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 36, height: 36 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(139,92,246,0.2)" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#8b5cf6", animation: "spin 0.8s linear infinite" }} />
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !lesson) return (
    <div style={{ minHeight: "100vh", background: "#09091a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <p style={{ color: "#f87171", fontSize: 14 }}>{error ?? "Lesson not found."}</p>
      <Link href="/learn" style={{ color: "#a78bfa", fontSize: 13, textDecoration: "none" }}>← Back to Learn</Link>
    </div>
  );

  const t         = theme(lesson.subject);
  const Icon      = t.icon;
  const d         = DIFF[lesson.difficulty] ?? DIFF.medium;
  const hasBlocks = Array.isArray(lesson.blocks) && lesson.blocks.length > 0;
  const earnedXP  = xpForDiff(lesson.difficulty);

  return (
    <div style={{ minHeight: "100vh", background: "#09091a", color: "#fff" }}>
      <style>{`
        @keyframes spin       { to { transform: rotate(360deg) } }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes pop        { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        .complete-btn:not(:disabled):hover { filter: brightness(1.08); }
        .quiz-btn:hover { filter: brightness(1.1); }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }} aria-hidden>
        <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: `radial-gradient(ellipse, ${t.hex}22 0%, transparent 65%)`, borderRadius: "50%" }} />
      </div>

      {/* ── Completion toast ── */}
      {showToast && (
        <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 50, animation: "fadeSlideUp 0.35s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg, #052e16, #14532d)", border: "1px solid rgba(52,211,153,0.35)", borderRadius: 16, padding: "14px 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(52,211,153,0.15)" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(52,211,153,0.15)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pop 0.5s ease 0.2s" }}>
              <CheckCircle2 size={18} color="#34d399" />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#f0fdf4", margin: 0 }}>Lesson Complete! 🎉</p>
              <p style={{ fontSize: 12, color: "#86efac", margin: "2px 0 0" }}>+{earnedXP} XP earned · Now take the quiz!</p>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "relative", maxWidth: 720, margin: "0 auto", padding: "32px 16px 60px" }}>

        <Link href="/learn" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#475569", fontSize: 13, textDecoration: "none", marginBottom: 28 }}
          onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
          onMouseLeave={e => (e.currentTarget.style.color = "#475569")}>
          <ArrowLeft size={15} /> Back to Learn
        </Link>

        {/* ── Header card ── */}
        <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", background: `radial-gradient(ellipse at 90% 10%, ${t.hex}28 0%, transparent 55%), linear-gradient(160deg, #131330 0%, #0f0f24 100%)`, marginBottom: 28, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}>
          <div style={{ height: 3, background: `linear-gradient(90deg, ${t.hex}, ${t.hex}44)` }} />
          <div style={{ padding: "24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={15} color={t.text} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{lesson.subject}</span>
              <span style={{ color: "#334155" }}>·</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: d.text, background: d.bg, border: `1px solid ${d.border}`, borderRadius: 999, padding: "3px 10px" }}>{d.label}</span>
              {lesson.completed && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#34d399", background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 999, padding: "3px 10px" }}>
                  <CheckCircle2 size={11} /> Completed
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px", lineHeight: 1.3 }}>{lesson.title}</h1>
            {lesson.description && <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 18px", lineHeight: 1.6 }}>{lesson.description}</p>}

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#a78bfa", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", padding: "4px 12px", borderRadius: 999 }}>
                <Sparkles size={11} /> AI Generated Lesson
              </span>
            </div>

            {lesson.blocks!.map((block, i) => <BlockCard key={i} block={block} />)}

            {/* ── Action bar ── */}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              {/* Mark complete */}
              {lesson.completed ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 16, fontSize: 14, fontWeight: 600, color: "#34d399" }}>
                  <CheckCircle2 size={17} /> Completed · +{earnedXP} XP
                </div>
              ) : (
                <button onClick={markComplete} disabled={completing} className="complete-btn"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", background: completing ? "rgba(52,211,153,0.06)" : "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(52,211,153,0.15))", border: "1px solid rgba(52,211,153,0.3)", borderRadius: 16, cursor: completing ? "not-allowed" : "pointer", color: "#34d399", fontSize: 14, fontWeight: 700, transition: "all .2s" }}>
                  {completing ? (
                    <><div style={{ width: 15, height: 15, borderRadius: "50%", border: "2px solid rgba(52,211,153,0.3)", borderTopColor: "#34d399", animation: "spin 0.8s linear infinite" }} />Saving…</>
                  ) : (
                    <><CheckCircle2 size={17} /> Mark Complete · +{earnedXP} XP</>
                  )}
                </button>
              )}

              {/* Take quiz */}
              <Link href={`/learn/${lessonId}/quiz`} className="quiz-btn"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", background: "linear-gradient(135deg, #7c3aed, #2563eb)", border: "none", borderRadius: 16, color: "#fff", fontSize: 14, fontWeight: 700, textDecoration: "none", transition: "filter .15s", boxShadow: "0 0 20px rgba(109,40,217,0.3)" }}>
                <HelpCircle size={17} /> Test Yourself <ArrowRight size={14} />
              </Link>

              {/* Socratic Tutor */}
              <button onClick={() => setShowTutor(true)}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 16, cursor: "pointer", color: "#a5b4fc", fontSize: 14, fontWeight: 700, transition: "filter .15s" }}>
                <MessageSquare size={17} /> Ask Tutor
              </button>

              {/* Download */}
              <button onClick={handleDownload} disabled={downloading}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", background: downloading ? "rgba(245,158,11,0.1)" : "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,146,60,0.15))", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 16, cursor: downloading ? "not-allowed" : "pointer", color: "#f59e0b", fontSize: 14, fontWeight: 700, transition: "filter .15s" }}>
                {downloading ? (
                  <><div style={{ width: 15, height: 15, borderRadius: "50%", border: "2px solid rgba(245,158,11,0.3)", borderTopColor: "#f59e0b", animation: "spin 0.8s linear infinite" }} />{downloadProgress}%</>
                ) : (
                  <><Download size={17} /> Download</>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "52px 24px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20 }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <BookOpen size={21} color="#334155" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#475569", margin: "0 0 6px" }}>No content yet</p>
            <p style={{ fontSize: 13, color: "#334155", margin: "0 0 20px" }}>This lesson was saved before content generation was added.</p>
            <Link href="/learn" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#a78bfa", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 10, padding: "9px 16px", textDecoration: "none" }}>
              Generate a new lesson
            </Link>
          </div>
        )}

        {lesson.updated_at && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 28, color: "#334155", fontSize: 12 }}>
            <Clock size={11} />
            Last updated {new Date(lesson.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}
      </div>

      {/* Socratic Tutor Modal */}
      {showTutor && lesson && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 700, height: "80vh", background: "#0f0f24", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
            <SocraticTutor
              userId={currentUser || ""}
              subject={lesson.subject}
              topic={lesson.title}
              lessonContext={{
                lessonId: lesson.id,
                title: lesson.title,
                subject: lesson.subject,
                description: lesson.description,
                blocks: lesson.blocks,
                difficulty: lesson.difficulty,
                completed: lesson.completed,
                progress: lesson.progress,
              }}
              onClose={() => setShowTutor(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
