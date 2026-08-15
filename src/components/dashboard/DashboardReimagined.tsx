"use client";

import "./DashboardReimagined.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight, BrainCircuit, CalendarClock, CheckCircle2,
  Loader2, RotateCcw, Target, Trophy, BookOpen, Clock3, Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStudentIntelligence } from "@/lib/student-intelligence";
import { withTimeout, TimeoutError } from "@/lib/async/withTimeout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCountUp } from "@/components/ui/CountUp";
import StreakDisplay from "@/components/StreakDisplay";
import GoalTracker from "@/components/GoalTracker";

type Intelligence = any;
const TIMEOUT = 15000;

const SUBJECT_ACCENTS: Record<string, string> = {
  Mathematics: "#8b5cf6", Physics: "#38bdf8", Chemistry: "#22d3ee", Biology: "#34d399",
  History: "#f59e0b", Geography: "#2dd4bf", Economics: "#4ade80", "Computer Science": "#818cf8", default: "#a78bfa",
};
function accentFor(subject?: string) { return SUBJECT_ACCENTS[subject || ""] || SUBJECT_ACCENTS.default; }

export default function DashboardReimagined() {
  const router = useRouter(); const supabase = createClient();
  const prefersReducedMotion = useReducedMotionSafe();
  const [data, setData] = useState<Intelligence | null>(null); const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); const [intelLoading, setIntelLoading] = useState(true);
  const [intelError, setIntelError] = useState<string | null>(null); const [userName, setUserName] = useState("Student"); const [userId, setUserId] = useState<string | null>(null);

  const load = async (id: string) => {
    setIntelLoading(true); setIntelError(null);
    try { const result = await withTimeout(getStudentIntelligence(id), TIMEOUT, "Dashboard intelligence timed out"); if (!result) throw new Error("No intelligence returned"); setData(result); }
    catch (error) { setIntelError(error instanceof TimeoutError ? "Cortex took too long to respond." : "Cortex could not load your recommendations."); }
    finally { setIntelLoading(false); }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser(); if (!auth.user) { router.push("/auth/login"); return; } if (!alive) return;
      setUserId(auth.user.id); setUserName(auth.user.user_metadata?.full_name?.split(" ")[0] || auth.user.email?.split("@")[0] || "Student"); void load(auth.user.id);
      const { data: examData } = await supabase.from("exams").select("id, subject, exam_date").eq("user_id", auth.user.id).gte("exam_date", new Date().toISOString().split("T")[0]).order("exam_date", { ascending: true }).limit(5);
      if (alive) setExams(examData || []); if (alive) setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <DashboardLoading />;

  const intel = data?.intelligence; const next = intel?.recommendations?.[0]; const weak = intel?.weakAreas?.[0]; const insight = intel?.insights?.[0];
  const progress = data?.progress?.overallCompletion; const score = data?.performance?.trends?.averageScore;
  const subjects = (data?.progress?.subjects || []).slice(0, 6);
  const recentLessons = (data?.progress?.lessons || []).filter((lesson: any) => lesson.lastAttempted).sort((a: any, b: any) => new Date(b.lastAttempted).getTime() - new Date(a.lastAttempted).getTime()).slice(0, 3);
  const activeMinutes = data?.activity?.patterns?.averageDailyStudyTime; const recommendationCount = intel?.recommendations?.length || 0;
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"; const nextAccent = accentFor(next?.subject || weak?.subject);

  const openRecommendation = (item: any) => { const params = new URLSearchParams(); if (item?.subject) params.set("subject", item.subject); const topic = item?.topic || item?.title || ""; if (topic) params.set("topic", topic); router.push(`/learn?${params.toString()}`); };

  const containerVariants = prefersReducedMotion
    ? { hidden: {}, show: {} }
    : { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } } };
  const itemVariants = prefersReducedMotion
    ? { hidden: {}, show: {} }
    : { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } };

  return (
    <main className="dashboard-command-center min-h-full">
      <div className="dashboard-ambient dashboard-ambient-one" aria-hidden="true" /><div className="dashboard-ambient dashboard-ambient-two" aria-hidden="true" />
      <motion.div className="dashboard-shell mx-auto w-full max-w-[1480px] px-4 pb-14 pt-5 sm:px-6 lg:px-8" variants={containerVariants} initial="hidden" animate="show">
        <motion.header className="dashboard-header" variants={itemVariants}>
          <div><p className="dashboard-kicker"><Sparkles className="h-3.5 w-3.5" /> Your learning cockpit</p><h1>{greeting}, {userName}.</h1><p>One place to see what needs your attention, what is improving, and what to do next.</p></div>
          <div className="dashboard-header-stat"><span>Study rhythm</span><strong>{activeMinutes == null ? "Building" : <CountUpText value={Math.round(activeMinutes)} suffix="m" />}</strong><small>average daily</small></div>
        </motion.header>

        <motion.section className="dashboard-hero" style={{ ["--hero-accent" as string]: nextAccent }} aria-labelledby="next-heading" variants={itemVariants}>
          <div className="dashboard-hero-orb" aria-hidden="true" /><div className="dashboard-hero-content"><div className="dashboard-hero-label"><span className="dashboard-live-dot" /> NEXT BEST MOVE</div>
            {intelLoading ? <div className="dashboard-loading-line"><Loader2 className="h-4 w-4 animate-spin" /> Reading your learning signals…</div> : next ? <><div className="dashboard-hero-copy"><div><span className="dashboard-recommendation-type">{next.type || "practice"}{next.estimatedTime ? ` · ${next.estimatedTime} min` : ""}</span><h2 id="next-heading">{next.title}</h2><p>{next.description || next.reason}</p></div><button className="dashboard-primary-action" type="button" onClick={() => openRecommendation(next)}>Begin <ArrowRight className="h-4 w-4" /></button></div>{next.reason && <div className="dashboard-hero-reason"><BrainCircuit className="h-4 w-4" /> {next.reason}</div>}</> : <div className="dashboard-hero-copy"><div><span className="dashboard-recommendation-type">YOU'RE CLEAR</span><h2 id="next-heading">No urgent task right now.</h2><p>Keep building evidence through learning and practice. Cortex will adjust your next move.</p></div><Button onClick={() => router.push("/learn")}>Explore Learn <ArrowRight className="ml-2 h-4 w-4" /></Button></div>}
          </div>
        </motion.section>

        <motion.div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }} className="dashboard-goal-streak-row" variants={itemVariants}>
          <StreakDisplay />
          <GoalTracker />
        </motion.div>

        <motion.section className="dashboard-momentum" aria-label="Your momentum" variants={itemVariants}><Metric icon={<CheckCircle2 />} label="Progress" value={progress == null ? null : Math.round(progress)} suffix="%" detail="overall completion" /><Metric icon={<Trophy />} label="Average" value={score == null ? null : Math.round(score)} suffix="%" detail="recent performance" /><Metric icon={<Target />} label="Cortex queue" value={recommendationCount || null} detail="recommendations ready" /></motion.section>

        <div className="dashboard-grid"><div className="dashboard-main-column">
          <motion.section aria-labelledby="subjects-heading" variants={itemVariants}><SectionTitle kicker="Your map" title="Subjects in motion" />{subjects.length ? <div className="dashboard-subject-grid">{subjects.map((subject: any) => <SubjectTile key={subject.subject} subject={subject} onClick={() => router.push(`/learn?subject=${encodeURIComponent(subject.subject)}`)} />)}</div> : <Card><CardContent className="p-6 text-sm text-muted-foreground">Your subject progress will appear here as you learn.</CardContent></Card>}</motion.section>
          <motion.section aria-labelledby="today-heading" variants={itemVariants}><SectionTitle kicker="Keep moving" title="Today" /><Card className="dashboard-panel"><CardContent className="p-2 sm:p-3">{intel?.recommendations?.slice(0, 3).length ? intel.recommendations.slice(0, 3).map((item: any, i: number) => <button key={item.id || i} type="button" onClick={() => openRecommendation(item)} className="dashboard-today-row"><span className="dashboard-row-icon" style={{ ["--row-accent" as string]: accentFor(item.subject) }}><Target className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong>{item.title}</strong><small>{item.description}</small></span><span className="dashboard-row-time">{item.estimatedTime ? `${item.estimatedTime}m` : "Start"}<ArrowRight className="h-4 w-4" /></span></button>) : <p className="p-5 text-sm text-muted-foreground">Shadecode will build your plan as it learns more about your work.</p>}</CardContent></Card></motion.section>
          <motion.section aria-labelledby="recent-heading" variants={itemVariants}><SectionTitle kicker="Your trail" title="Recently touched" /><Card className="dashboard-panel"><CardContent className="p-0">{recentLessons.length ? recentLessons.map((lesson: any) => <button key={lesson.lessonId} type="button" className="dashboard-recent-row" onClick={() => router.push(`/learn?subject=${encodeURIComponent(lesson.subject)}&topic=${encodeURIComponent(lesson.lessonTitle)}`)}><span className="dashboard-row-icon soft"><BookOpen className="h-4 w-4" /></span><span className="min-w-0 flex-1"><strong>{lesson.lessonTitle}</strong><small>{lesson.subject} · {lesson.progress ?? 0}% complete</small></span><span className="dashboard-row-meta"><Clock3 className="h-3.5 w-3.5" /> {timeAgo(lesson.lastAttempted)}</span></button>) : <p className="p-5 text-sm text-muted-foreground">Your recent lessons will show up here.</p>}</CardContent></Card></motion.section>
        </div>

        <motion.aside className="dashboard-side-column" variants={itemVariants}><section aria-labelledby="focus-heading"><SectionTitle kicker="High impact" title="Focus area" /><Card className="dashboard-focus" style={{ ["--focus-accent" as string]: accentFor(weak?.subject) }}><CardContent className="p-5">{weak ? <><div className="dashboard-focus-top"><span className="dashboard-focus-chip">{weak.subject}</span><span className={`dashboard-severity severity-${weak.severity}`}>{weak.severity}</span></div><h3 id="focus-heading">{weak.topic}</h3><div className="dashboard-score-line"><span>Current signal</span><strong>{Math.round(weak.score)}%</strong></div><div className="dashboard-score-track"><span style={{ width: `${Math.max(0, Math.min(100, weak.score))}%` }} /></div><p>Focused practice here is likely to have the biggest near-term payoff.</p><button type="button" className="dashboard-outline-action" onClick={() => router.push(`/learn?subject=${encodeURIComponent(weak.subject)}&topic=${encodeURIComponent(weak.topic)}`)}>Work on {weak.topic} <ArrowRight className="h-4 w-4" /></button></> : <p id="focus-heading" className="text-sm leading-6 text-muted-foreground">Complete more practice and Cortex will surface the area where your effort can have the most impact.</p>}</CardContent></Card></section>
          <section aria-labelledby="upcoming-heading"><SectionTitle icon={<CalendarClock />} title="Next up" /><Card className="dashboard-panel"><CardContent className="p-0">{exams.length ? exams.slice(0, 4).map(exam => <button key={exam.id} type="button" onClick={() => router.push("/tasks")} className="dashboard-exam-row"><span><strong>{exam.subject}</strong><small>{formatDate(exam.exam_date)}</small></span><ArrowRight className="h-4 w-4" /></button>) : <p className="p-5 text-sm text-muted-foreground">No upcoming assessments.</p>}</CardContent></Card></section>
          <section aria-labelledby="cortex-heading"><SectionTitle icon={<BrainCircuit className="text-primary" />} title="Cortex signal" /><Card className="dashboard-cortex"><CardContent className="p-5">{intelError ? <><h3 id="cortex-heading">Cortex needs a moment</h3><p>{intelError}</p><button type="button" className="dashboard-outline-action" disabled={!userId || intelLoading} onClick={() => userId && load(userId)}>Retry <RotateCcw className="h-4 w-4" /></button></> : insight ? <><span className="dashboard-signal-label">{insight.type}</span><h3 id="cortex-heading">{insight.title || "A useful signal"}</h3><p>{insight.content}</p></> : <><h3 id="cortex-heading">Still learning your pattern</h3><p>Keep learning. Cortex becomes more useful as your activity and performance history grow.</p></>}</CardContent></Card></section>
        </motion.aside>
      </div>
      </motion.div>
    </main>
  );
}

function useReducedMotionSafe(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = () => setReduced(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function CountUpText({ value, suffix = "" }: { value: number; suffix?: string }) {
  const display = useCountUp(value);
  return <>{display ?? 0}{suffix}</>;
}

function Metric({ icon, label, value, suffix, detail }: { icon: React.ReactNode; label: string; value: number | null; suffix?: string; detail: string }) { return <div className="dashboard-metric"><span className="dashboard-metric-icon">{icon}</span><span><small>{label}</small><strong>{value == null ? "—" : <CountUpText value={value} suffix={suffix} />}</strong><em>{detail}</em></span></div>; }
function SubjectTile({ subject, onClick }: { subject: any; onClick: () => void }) {
  const accent = accentFor(subject.subject);
  const percent = Math.max(0, Math.min(100, Number(subject.completionPercentage) || 0));
  const [displayPercent, setDisplayPercent] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDisplayPercent(percent));
    return () => cancelAnimationFrame(frame);
  }, [percent]);
  return <button type="button" className="dashboard-subject-tile" onClick={onClick} style={{ ["--subject-accent" as string]: accent }}><span className="dashboard-subject-orb" /><span className="dashboard-subject-copy"><strong>{subject.subject}</strong><small>{subject.completedLessons || 0} of {subject.totalLessons || 0} lessons</small></span><span className="dashboard-progress-ring" style={{ ["--progress" as string]: `${displayPercent * 3.6}deg` }}><b>{Math.round(percent)}%</b></span></button>;
}
function SectionTitle({ kicker, title, icon }: { kicker?: string; title: string; icon?: React.ReactNode }) { return <div className="dashboard-section-title"><div>{kicker && <p>{kicker}</p>}<h2>{icon}{title}</h2></div></div>; }
function timeAgo(iso: string) { const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000); if (hours < 1) return "just now"; if (hours < 24) return `${hours}h ago`; const days = Math.floor(hours / 24); return days === 1 ? "yesterday" : `${days}d ago`; }
function formatDate(date: string) { return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
function DashboardLoading() { return <main className="dashboard-command-center dashboard-loading-state"><div className="dashboard-shell mx-auto w-full max-w-[1480px] px-4 py-8 sm:px-6 lg:px-8"><div className="dashboard-skeleton dashboard-skeleton-header" /><div className="dashboard-skeleton dashboard-skeleton-hero" /><div className="dashboard-skeleton dashboard-skeleton-metrics" /><div className="dashboard-skeleton dashboard-skeleton-grid" /></div></main>; }
