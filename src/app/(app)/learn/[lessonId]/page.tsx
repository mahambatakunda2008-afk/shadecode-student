"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import katex from "katex";
import "katex/dist/katex.min.css";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, ArrowRight, BookOpen, Calculator, CheckCircle2, Clock,
  Code2, Download, FlaskConical, Globe, Headphones, HelpCircle,
  MessageSquare, Mic, Pause, Zap, Dna, Brain, TrendingUp, Languages,
  Music, Palette,
} from "lucide-react";
import SocraticTutor from "@/components/SocraticTutor";
import { downloadManager } from "@/lib/offline/downloadManager";
import { offlineStorage } from "@/lib/offline/storage";
import { useAchievementsContext } from "@/contexts/AchievementsContext";
import { useLessonNarration } from "@/hooks/useLessonNarration";

type LessonBlock = { type: string; title?: string; content: string };
type Lesson = {
  id: string; title: string; subject: string; description: string;
  difficulty: string; progress: number; completed: boolean;
  blocks?: LessonBlock[]; updated_at?: string;
};
type Theme = { hex: string; bg: string; border: string; text: string; icon: React.ComponentType<{ size?: number; color?: string }> };

const THEMES: Record<string, Theme> = {
  Mathematics: { hex: "#8b5cf6", bg: "rgba(139,92,246,.14)", border: "rgba(139,92,246,.28)", text: "#c4b5fd", icon: Calculator },
  Physics: { hex: "#3b82f6", bg: "rgba(59,130,246,.14)", border: "rgba(59,130,246,.28)", text: "#93c5fd", icon: Zap },
  Biology: { hex: "#10b981", bg: "rgba(16,185,129,.14)", border: "rgba(16,185,129,.28)", text: "#6ee7b7", icon: Dna },
  History: { hex: "#f59e0b", bg: "rgba(245,158,11,.14)", border: "rgba(245,158,11,.28)", text: "#fcd34d", icon: Globe },
  Chemistry: { hex: "#06b6d4", bg: "rgba(6,182,212,.14)", border: "rgba(6,182,212,.28)", text: "#67e8f9", icon: FlaskConical },
  Geography: { hex: "#14b8a6", bg: "rgba(20,184,166,.14)", border: "rgba(20,184,166,.28)", text: "#5eead4", icon: Globe },
  "Computer Science": { hex: "#6366f1", bg: "rgba(99,102,241,.14)", border: "rgba(99,102,241,.28)", text: "#a5b4fc", icon: Code2 },
  Psychology: { hex: "#ec4899", bg: "rgba(236,72,153,.14)", border: "rgba(236,72,153,.28)", text: "#f9a8d4", icon: Brain },
  Economics: { hex: "#22c55e", bg: "rgba(34,197,94,.14)", border: "rgba(34,197,94,.28)", text: "#86efac", icon: TrendingUp },
  Languages: { hex: "#f43f5e", bg: "rgba(244,63,94,.14)", border: "rgba(244,63,94,.28)", text: "#fda4af", icon: Languages },
  Music: { hex: "#a855f7", bg: "rgba(168,85,247,.14)", border: "rgba(168,85,247,.28)", text: "#d8b4fe", icon: Music },
  Art: { hex: "#f97316", bg: "rgba(249,115,22,.14)", border: "rgba(249,115,22,.28)", text: "#fdba74", icon: Palette },
  default: { hex: "#64748b", bg: "rgba(100,116,139,.14)", border: "rgba(100,116,139,.28)", text: "#94a3b8", icon: BookOpen },
};
const DIFF: Record<string, { label: string; text: string }> = {
  easy: { label: "Guided", text: "#6ee7b7" }, medium: { label: "Standard", text: "#93c5fd" }, hard: { label: "Challenge", text: "#c4b5fd" },
};
const FLOW = new Set(["objective", "prior", "concept", "definition", "formula", "math", "example", "exam", "summary", "application", "comparison", "practice"]);
const LABELS: Record<string, string> = {
  objective: "Learning objectives", prior: "Before you begin", concept: "Core idea", definition: "Key definitions",
  formula: "Formula / method", math: "Formula / method", example: "Worked example", application: "Apply it",
  comparison: "Compare", exam: "Exam transfer", practice: "Practice", summary: "Key takeaways",
};
const ASIDES: Record<string, { label: string; icon: string; accent: string }> = {
  checkpoint: { label: "Quick check", icon: "✓", accent: "#14b8a6" },
  misconception: { label: "Easy to get wrong", icon: "!", accent: "#f43f5e" },
  mistake: { label: "Watch out", icon: "!", accent: "#f97316" },
  tip: { label: "Study tip", icon: "i", accent: "#f59e0b" },
};

function theme(subject: string) { return THEMES[subject] ?? THEMES.default; }
function xpForDiff(d: string) { return d === "hard" ? 50 : d === "medium" ? 35 : 20; }

// Renders a LaTeX expression natively (proper fraction bars, exponents,
// integral signs) instead of leaving raw notation like "x^{n+1}/(n+1)" as
// literal text. Falls back to plain text if KaTeX can't parse it -- a
// slightly-off expression should never take down the whole lesson.
function renderMath(latex: string, key: string): ReactNode {
  try {
    const html = katex.renderToString(latex.trim(), { throwOnError: false, strict: false, displayMode: false });
    return <span key={key} dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span key={key}>{latex}</span>;
  }
}

// A formula line the model wrote without $ delimiters (e.g. raw
// "∫x^n dx = x^{n+1}/(n+1)+C, n≠-1.") still deserves native rendering rather
// than showing caret/brace syntax verbatim. If a formula-type line has no
// delimiters but looks mathematical, treat the whole line as one expression.
function looksMathematical(line: string): boolean {
  return /[\^_]|\\[a-zA-Z]+|[∫∑√±×÷≠≤≥→∞θπΔ]/.test(line);
}

function inline(text: string, key: string): ReactNode[] {
  return text.split(/(\$\$[^$]+\$\$|\$[^$]+\$|\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) => {
    const partKey = `${key}-${i}`;
    if (part.startsWith("$$") && part.endsWith("$$")) return renderMath(part.slice(2, -2), partKey);
    if (part.startsWith("$") && part.endsWith("$")) return renderMath(part.slice(1, -1), partKey);
    if (part.startsWith("**")) return <strong key={partKey} style={{ color: "var(--foreground)", fontWeight: 750 }}>{part.slice(2, -2)}</strong>;
    return <span key={partKey}>{part}</span>;
  });
}

function sentenceChunks(text: string): string[] {
  const normalized = text.replace(/\r/g, "").trim();
  if (!normalized) return [];
  const lines = normalized.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    if (/^[-•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) { out.push(line); continue; }
    const parts = line.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) ?? [line];
    for (const part of parts) if (part.trim()) out.push(part.trim());
  }
  return out;
}

function renderStructured(content: string, type: string): ReactNode {
  const lines = sentenceChunks(content);
  if (!lines.length) return null;

  const isFormula = type === "formula" || type === "math";
  const isExample = type === "example";
  const isPractice = type === "practice";
  const bullets = lines.filter(l => /^[-•]\s+/.test(l)).map(l => l.replace(/^[-•]\s+/, ""));
  const numbered = lines.filter(l => /^\d+[.)]\s+/.test(l)).map(l => l.replace(/^\d+[.)]\s+/, ""));
  const plain = lines.filter(l => !/^[-•]\s+/.test(l) && !/^\d+[.)]\s+/.test(l));

  if (isFormula) return (
    <div style={{ display: "grid", gap: 9 }}>
      {lines.map((line, i) => {
        const stripped = line.replace(/^[-•]\s+/, "");
        const wrapped = !stripped.includes("$") && looksMathematical(stripped) ? `$${stripped}$` : stripped;
        return <div key={i} className="lesson-line formula-line">{inline(wrapped, `f-${i}`)}</div>;
      })}
    </div>
  );

  if (isExample) {
    const labels = ["Given:", "Method:", "Step 1:", "Step 2:", "Step 3:", "Answer:", "Therefore:"];
    return <div style={{ display: "grid", gap: 9 }}>
      {lines.map((line, i) => {
        const label = labels.find(x => line.toLowerCase().startsWith(x.toLowerCase()));
        const value = label ? line.slice(label.length).trim() : line;
        return <div key={i} className={label ? "lesson-step" : "lesson-line"}>
          {label && <span className="lesson-label">{label}</span>} {inline(value, `e-${i}`)}
        </div>;
      })}
    </div>;
  }

  if (numbered.length >= 2 || isPractice) return (
    <ol className="lesson-steps">
      {(numbered.length ? numbered : plain).map((line, i) => <li key={i}>{inline(line, `n-${i}`)}</li>)}
      {numbered.length === 0 && bullets.map((line, i) => <li key={`b-${i}`}>{inline(line, `b-${i}`)}</li>)}
    </ol>
  );

  if (bullets.length >= 1) return (
    <ul className="lesson-points">{bullets.map((line, i) => <li key={i}>{inline(line, `b-${i}`)}</li>)}</ul>
  );

  return <div className="lesson-points plain-points">{plain.map((line, i) => <div key={i}>{inline(line, `p-${i}`)}</div>)}</div>;
}

function LessonUnit({ block, number }: { block: LessonBlock; number: number }) {
  const heading = block.title?.trim() || LABELS[block.type] || "Lesson section";
  return (
    <section className="lesson-unit">
      <div className="unit-kicker"><span>{String(number).padStart(2, "0")}</span><span>{heading}</span></div>
      <div className="unit-body">{renderStructured(block.content, block.type)}</div>
    </section>
  );
}

function AsideUnit({ block }: { block: LessonBlock }) {
  const s = ASIDES[block.type] ?? { label: "Note", icon: "•", accent: "#64748b" };
  return (
    <aside className="lesson-aside" style={{ borderColor: `${s.accent}66` }}>
      <div className="aside-title" style={{ color: s.accent }}><span>{s.icon}</span>{block.title?.trim() || s.label}</div>
      <div className="aside-body">{renderStructured(block.content, block.type)}</div>
    </aside>
  );
}

export default function LessonDetailPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.lessonId as string;
  const { checkNewAchievements } = useAchievementsContext();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState("");
  const [completing, setCompleting] = useState(false);
  const [showTutor, setShowTutor] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const narration = useLessonNarration(lesson?.blocks ?? []);

  const loadLesson = async (token: string) => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/learn?lessonId=${lessonId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) { let msg = "Couldn't load this lesson."; try { const b = await r.json(); msg = b?.error || msg; } catch {} throw new Error(msg); }
      const d = await r.json();
      if (!d.lesson) throw new Error("Lesson content not found.");
      setLesson(d.lesson); setAccessToken(token);
      void offlineStorage.saveLesson({ ...d.lesson, downloadedAt: new Date().toISOString(), lastSyncedAt: new Date().toISOString(), size: JSON.stringify(d.lesson).length }).catch(() => undefined);
    } catch (err) {
      try {
        const cached = await offlineStorage.getLesson(lessonId);
        if (cached) { setLesson({ ...cached, description: cached.description ?? "", difficulty: cached.difficulty ?? "medium", progress: cached.progress ?? 0, completed: cached.completed ?? false, blocks: (cached.blocks as unknown as LessonBlock[]) ?? [], updated_at: cached.lastSyncedAt }); return; }
      } catch {}
      setError(err instanceof Error ? err.message : "Couldn't load this lesson.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      const sb = createClient();
      try {
        const { data } = await sb.auth.getSession();
        if (data?.session) { setCurrentUser(data.session.user.id); await loadLesson(data.session.access_token); return; }
      } catch {}
      try {
        const cached = await offlineStorage.getLesson(lessonId);
        if (cached) { setLesson({ ...cached, description: cached.description ?? "", difficulty: cached.difficulty ?? "medium", progress: cached.progress ?? 0, completed: cached.completed ?? false, blocks: (cached.blocks as unknown as LessonBlock[]) ?? [], updated_at: cached.lastSyncedAt }); setLoading(false); return; }
      } catch {}
      if (navigator.onLine) router.push("/login"); else { setError("You are offline and this lesson has not been cached on this device yet."); setLoading(false); }
    })();
  }, [lessonId]);

  useEffect(() => {
    const online = () => { if (currentUser) void downloadManager.syncProgress(currentUser).catch(() => undefined); };
    window.addEventListener("online", online); return () => window.removeEventListener("online", online);
  }, [currentUser]);

  useEffect(() => {
    if (!lesson || lesson.completed) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      localStorage.setItem(`lesson_scroll_${lessonId}`, String(window.scrollY));
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const progress = height > 0 ? Math.min(100, Math.round((window.scrollY / height) * 100)) : 0;
      if (progress >= 100 && accessToken) {
        clearTimeout(timeout); timeout = setTimeout(() => { void markComplete(); }, 800);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (timeout) clearTimeout(timeout); };
  }, [lesson, accessToken, lessonId]);

  async function markComplete() {
    if (!lesson || !accessToken || completing || lesson.completed) return;
    setCompleting(true);
    try {
      const r = await fetch("/api/learn", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ lessonId: lesson.id, progress: 100 }) });
      if (!r.ok) throw new Error();
      setLesson(x => x ? { ...x, progress: 100, completed: true } : x); setShowToast(true); checkNewAchievements();
      setTimeout(() => setShowToast(false), 3500);
    } catch {} finally { setCompleting(false); }
  }

  async function handleDownload() {
    if (!lesson || downloading) return;
    setDownloading(true); setDownloadProgress(0);
    try { await downloadManager.downloadAll(lesson.id, lesson, undefined, undefined, p => setDownloadProgress(p)); setShowToast(true); setTimeout(() => setShowToast(false), 2500); }
    catch (e) { console.error("Download failed:", e); }
    finally { setDownloading(false); setDownloadProgress(0); }
  }

  if (loading) return <div className="lesson-loading"><div className="spinner" /></div>;
  if (error || !lesson) return <div className="lesson-error"><p>{error ?? "Lesson not found."}</p><div><Link href="/learn">← Back to Learn</Link>{error && accessToken && <button onClick={() => void loadLesson(accessToken)}>Retry</button>}</div></div>;

  const t = theme(lesson.subject); const Icon = t.icon; const d = DIFF[lesson.difficulty] ?? DIFF.medium;
  const blocks = Array.isArray(lesson.blocks) ? lesson.blocks : [];
  let unitNumber = 0;

  return (
    <div className="lesson-page" style={{ "--lesson-accent": t.hex, "--lesson-soft": t.bg, "--lesson-border": t.border } as React.CSSProperties}>
      <style>{`
        .lesson-page{min-height:100vh;background:var(--background);color:var(--foreground)}
        .lesson-shell{width:min(820px,100%);margin:auto;padding:28px 18px 72px}
        .lesson-back{display:inline-flex;align-items:center;gap:7px;color:var(--muted-foreground);font-size:13px;text-decoration:none;margin-bottom:22px}
        .lesson-hero{border:1px solid var(--card-border);border-radius:22px;background:linear-gradient(135deg,var(--card),var(--lesson-soft));overflow:hidden;margin-bottom:30px}
        .lesson-hero-bar{height:3px;background:linear-gradient(90deg,var(--lesson-accent),transparent)}
        .lesson-hero-inner{padding:24px 26px}
        .lesson-meta{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:14px;font-size:13px}
        .lesson-subject{display:inline-flex;align-items:center;gap:7px;color:var(--lesson-accent);font-weight:700}
        .lesson-badge{border:1px solid var(--lesson-border);background:var(--lesson-soft);color:${d.text};padding:3px 9px;border-radius:999px;font-size:12px;font-weight:700}
        .lesson-title{font-size:clamp(25px,4vw,34px);line-height:1.13;letter-spacing:-.025em;margin:0 0 10px;font-weight:850}
        .lesson-desc{font-size:14px;line-height:1.65;color:var(--muted-foreground);margin:0 0 18px;max-width:680px}
        .progress-label{display:flex;justify-content:space-between;color:var(--muted-foreground);font-size:11px;margin-bottom:6px}.progress-track{height:5px;background:var(--surface-2);border-radius:99px;overflow:hidden}.progress-fill{height:100%;background:var(--lesson-accent);border-radius:99px}
        .lesson-content{display:flex;flex-direction:column}
        .lesson-unit{padding:0 0 30px;margin:0 0 30px;border-bottom:1px solid var(--card-border)}
        .unit-kicker{display:flex;align-items:center;gap:11px;color:var(--muted-foreground);font-size:12px;font-weight:800;letter-spacing:.035em;text-transform:uppercase;margin-bottom:13px}.unit-kicker span:first-child{color:var(--lesson-accent);font-variant-numeric:tabular-nums}.unit-kicker span:last-child{color:var(--foreground)}
        .unit-body{font-size:15px;line-height:1.65;max-width:740px}
        .lesson-points{display:flex;flex-direction:column;gap:9px;margin:0;padding-left:20px;color:var(--muted-foreground)}.lesson-points li{padding-left:4px}.plain-points{padding-left:0;gap:11px}.plain-points>div{position:relative;padding-left:16px}.plain-points>div:before{content:"";position:absolute;left:0;top:.68em;width:5px;height:5px;border-radius:50%;background:var(--lesson-accent)}
        .lesson-steps{display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none;counter-reset:step}.lesson-steps li{counter-increment:step;position:relative;padding:11px 14px 11px 46px;background:var(--surface-2);border:1px solid var(--card-border);border-radius:12px;color:var(--muted-foreground)}.lesson-steps li:before{content:counter(step);position:absolute;left:13px;top:11px;width:23px;height:23px;border-radius:7px;background:var(--lesson-soft);color:var(--lesson-accent);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}
        .lesson-line{color:var(--muted-foreground);margin-bottom:7px}.lesson-step{color:var(--muted-foreground);padding:9px 12px;border-left:2px solid var(--lesson-border);margin-bottom:7px}.lesson-label{font-weight:800;color:var(--foreground);margin-right:4px}.formula-line{color:var(--foreground);background:var(--surface-2);border:1px solid var(--card-border);border-radius:10px;padding:12px 14px;font-size:15px;overflow:auto}.formula-line .katex{font-size:1.05em}
        .lesson-aside{margin:0 0 25px 14px;padding:13px 0 13px 16px;border-left:2px solid}.aside-title{font-size:12px;font-weight:850;display:flex;gap:8px;align-items:center;margin-bottom:7px}.aside-body{color:var(--muted-foreground);font-size:14px;line-height:1.65}
        .lesson-actions{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-top:4px}.lesson-action{min-height:48px;border-radius:13px;border:1px solid var(--card-border);background:var(--surface-2);color:var(--foreground);display:flex;align-items:center;justify-content:center;gap:7px;font-size:12px;font-weight:750;text-decoration:none;cursor:pointer;padding:8px}.lesson-action.primary{background:linear-gradient(135deg,rgba(16,185,129,.22),rgba(52,211,153,.10));border-color:rgba(52,211,153,.3);color:#34d399}.lesson-action.quiz{background:linear-gradient(135deg,#7c3aed,#2563eb);border-color:transparent;color:#fff}.lesson-action:disabled{opacity:.55;cursor:not-allowed}
        .lesson-note{text-align:center;color:var(--muted-foreground);font-size:11px;margin-top:8px}.lesson-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:100;background:var(--card);border:1px solid rgba(52,211,153,.3);border-radius:14px;padding:12px 16px;color:#34d399;font-size:13px;font-weight:750;box-shadow:0 12px 40px rgba(0,0,0,.35)}
        .lesson-loading,.lesson-error{min-height:100vh;background:var(--background);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px;color:var(--muted-foreground);padding:24px}.lesson-error a,.lesson-error button{margin:0 6px;color:#a78bfa;background:none;border:0;cursor:pointer;text-decoration:none;font-size:13px}.spinner{width:34px;height:34px;border-radius:50%;border:2px solid var(--card-border);border-top-color:#8b5cf6;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:640px){.lesson-shell{padding:20px 13px 55px}.lesson-hero-inner{padding:20px 18px}.lesson-title{font-size:25px}.lesson-actions{grid-template-columns:repeat(2,1fr)}.lesson-action:last-child{grid-column:1/-1}.lesson-aside{margin-left:4px}.unit-body{font-size:14px}.lesson-steps li{padding-left:43px}}
      `}</style>

      {showToast && <div className="lesson-toast"><CheckCircle2 size={15} style={{ verticalAlign: "-3px", marginRight: 6 }} />{lesson.completed ? "Lesson complete. XP earned." : "Lesson saved for offline use."}</div>}
      <main className="lesson-shell">
        <Link href="/learn" className="lesson-back"><ArrowLeft size={15} />Back to Learn</Link>

        <header className="lesson-hero">
          <div className="lesson-hero-bar" />
          <div className="lesson-hero-inner">
            <div className="lesson-meta">
              <span className="lesson-subject"><Icon size={15} color={t.text} />{lesson.subject}</span>
              <span>·</span><span className="lesson-badge">{d.label}</span>
              {lesson.completed && <span className="lesson-badge" style={{ color: "#34d399", borderColor: "rgba(52,211,153,.25)" }}><CheckCircle2 size={11} style={{ verticalAlign: "-1px" }} /> Completed</span>}
            </div>
            <h1 className="lesson-title">{lesson.title}</h1>
            {lesson.description && <p className="lesson-desc">{lesson.description}</p>}
            <div className="progress-label"><span>Progress</span><strong style={{ color: t.text }}>{lesson.progress}%</strong></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${lesson.progress}%` }} /></div>
          </div>
        </header>

        {blocks.length ? <div className="lesson-content">
          {blocks.map((block, i) => FLOW.has(block.type) ? <LessonUnit key={i} block={block} number={++unitNumber} /> : <AsideUnit key={i} block={block} />)}

          <div className="lesson-actions">
            {lesson.completed ? <div className="lesson-action primary"><CheckCircle2 size={16} />Completed · +{xpForDiff(lesson.difficulty)} XP</div> : <button className="lesson-action primary" onClick={() => void markComplete()} disabled={completing}>{completing ? "Saving…" : <><CheckCircle2 size={16} />Mark Complete</>}</button>}
            <Link className="lesson-action quiz" href={`/learn/${lessonId}/quiz`}><HelpCircle size={16} />Test Yourself<ArrowRight size={13} /></Link>
            <button className="lesson-action" onClick={() => setShowTutor(true)}><MessageSquare size={16} />Ask Tutor</button>
            <button className="lesson-action" onClick={() => void handleDownload()} disabled={downloading}><Download size={16} />{downloading ? `${downloadProgress}%` : "Download"}</button>
            {narration.speechSupported && <button className="lesson-action" onClick={narration.status === "idle" ? narration.start : narration.stop}>{narration.status === "speaking" ? <><Pause size={16} />Reading {narration.currentIndex + 1}/{narration.totalSegments}</> : narration.status === "listening" ? <><Mic size={16} />Listening…</> : <><Headphones size={16} />Listen</>}</button>}
          </div>
          {narration.status !== "idle" && narration.voiceCommandsSupported && <p className="lesson-note">Say “next”, “repeat”, or “pause” between sections.</p>}
        </div> : <div style={{ textAlign: "center", padding: 50, color: "var(--muted-foreground)" }}><BookOpen size={28} /><p>No content yet.</p><Link href="/learn" style={{ color: "#a78bfa" }}>Generate a new lesson</Link></div>}

        {lesson.updated_at && <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 28, color: "var(--muted-foreground)", fontSize: 11 }}><Clock size={11} />Last updated {new Date(lesson.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>}
      </main>

      {showTutor && <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
        <div style={{ width: "100%", maxWidth: 700, height: "82vh", background: "#0f0f24", border: "1px solid var(--card-border)", borderRadius: 16, overflow: "hidden" }}>
          <SocraticTutor userId={currentUser} subject={lesson.subject} topic={lesson.title} lessonContext={{ lessonId: lesson.id, title: lesson.title, subject: lesson.subject, description: lesson.description, blocks: lesson.blocks, difficulty: lesson.difficulty, completed: lesson.completed, progress: lesson.progress }} onClose={() => setShowTutor(false)} />
        </div>
      </div>}
    </div>
  );
}
