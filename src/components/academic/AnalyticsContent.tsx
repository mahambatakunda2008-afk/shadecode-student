"use client";

import { rollUpSyllabusCoverage } from "@/lib/topicMastery/coverage";
import type { CurriculumTopicUnit } from "@/lib/topicMastery/resolver";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ExportMenu from "@/components/exports/ExportMenu";
import Link from "next/link";

interface ExamResult {
  id: string;
  subject: string;
  topic: string | null;
  difficulty: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  weak_areas: string[];
  time_taken: number;
  created_at: string;
}

interface FocusSession {
  id: string;
  duration_minutes: number;
  xp_earned: number;
  mode: string | null;
  created_at: string;
}

interface LearningEvent {
  id: string;
  type: string;
  subject: string | null;
  topic: string | null;
  score: number | null;
  time_spent: number | null;
  created_at: string;
}

interface Task {
  id: string;
  completed: boolean;
  created_at: string;
}

interface TopicMastery {
  id: string;
  subject: string;
  topic: string;
  mastery_score: number;
  trend: number | null;
  recent_improvement: number | null;
  last_attempted: string | null;
  syllabus_id: string | null;
  curriculum_topic_key: string | null;
}

const FETCH_TIMEOUT_MS = 10000;

function getGrade(score: number) {
  if (score >= 90) return { grade: "A*", color: "var(--warning)" };
  if (score >= 80) return { grade: "A", color: "var(--success)" };
  if (score >= 70) return { grade: "B", color: "var(--success)" };
  if (score >= 60) return { grade: "C", color: "var(--info)" };
  if (score >= 50) return { grade: "D", color: "var(--accent)" };
  if (score >= 40) return { grade: "E", color: "var(--warning)" };
  return { grade: "U", color: "var(--danger)" };
}

/** Translucent tint of a CSS colour or token (the `${hex}15` suffix trick is invalid for var() colours). */
const tint = (color: string, percent = 9) => `color-mix(in srgb, ${color} ${percent}%, transparent)`;

const CARD = "ssc-card p-4";
const CARD_TITLE = "text-sm font-extrabold";
const META = "text-[11px] text-[var(--muted-foreground)]";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function AnalyticsSkeleton() {
  return (
    <div role="status" aria-label="Loading analytics" className="flex flex-col gap-4 px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
      <div className="h-[70px] animate-pulse rounded-xl bg-[var(--muted)] opacity-60" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[88px] animate-pulse rounded-xl bg-[var(--muted)] opacity-60" />)}
      </div>
      {[0, 1, 2].map((i) => <div key={i} className="h-[180px] animate-pulse rounded-xl bg-[var(--muted)] opacity-60" />)}
    </div>
  );
}

function AnalyticsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <div aria-hidden="true" className="mb-4 grid h-14 w-14 place-items-center rounded-full text-[22px]" style={{ background: tint("var(--danger)", 12) }}>⚠️</div>
      <p className="mb-2 text-[17px] font-extrabold">Couldn&apos;t load analytics</p>
      <p className="mb-5 max-w-[300px] text-[13px] text-[var(--muted-foreground)]">Your study data is still safe. Check your connection and try again.</p>
      <button type="button" onClick={onRetry} className="ssc-button min-h-11 px-6 font-bold">Try again</button>
    </div>
  );
}

export default function AnalyticsContent() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [learningEvents, setLearningEvents] = useState<LearningEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mastery, setMastery] = useState<TopicMastery[]>([]);
  const [topicUnits, setTopicUnits] = useState<CurriculumTopicUnit[]>([]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(false);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Analytics request timed out")), FETCH_TIMEOUT_MS);
      });

      const request = (async () => {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) {
          router.push("/auth/login");
          return null;
        }

        const userId = authData.user.id;
        const [examQuery, focusQuery, eventQuery, taskQuery, masteryQuery, unitsQuery] = await Promise.all([
          supabase.from("exam_results").select("id, subject, topic, difficulty, score, total_questions, correct_answers, weak_areas, time_taken, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
          supabase.from("focus_sessions").select("id, duration_minutes, xp_earned, mode, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
          supabase.from("learning_events").select("id, type, subject, topic, score, time_spent, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
          supabase.from("tasks").select("id, completed, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1000),
          supabase.from("topic_mastery").select("id, subject, topic, mastery_score, trend, recent_improvement, last_attempted, syllabus_id, curriculum_topic_key").eq("user_id", userId).order("mastery_score", { ascending: true }).limit(500),
          supabase.from("curriculum_topic_units").select("syllabus_id, subject_id, topic_key, title"),
        ]);

        const queries = [examQuery, focusQuery, eventQuery, taskQuery, masteryQuery];
        const failed = queries.find((query) => query.error);
        if (failed?.error) throw failed.error;

        return {
          exams: ((examQuery.data ?? []) as ExamResult[]).map((row) => ({ ...row, weak_areas: Array.isArray(row.weak_areas) ? row.weak_areas : [] })),
          focus: (focusQuery.data ?? []) as FocusSession[],
          events: (eventQuery.data ?? []) as LearningEvent[],
          tasks: (taskQuery.data ?? []) as Task[],
          mastery: (masteryQuery.data ?? []) as TopicMastery[],
          // Titles are decoration for the coverage card; a failure here must not break analytics.
          topicUnits: ((unitsQuery.error ? [] : unitsQuery.data) ?? []).map((row: { syllabus_id: string; subject_id: string; topic_key: string; title: string }) => ({ syllabusId: row.syllabus_id, subjectId: row.subject_id, topicKey: row.topic_key, title: row.title })) as CurriculumTopicUnit[],
        };
      })();

      const data = await Promise.race([request, timeout]);
      if (!data) return;
      setExams(data.exams);
      setFocusSessions(data.focus);
      setLearningEvents(data.events);
      setTasks(data.tasks);
      setMastery(data.mastery);
      setTopicUnits(data.topicUnits);
    } catch (err) {
      console.error("[Analytics] load failed:", err);
      setError(true);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => { void loadAnalytics(); }, [loadAnalytics, retry]);

  const metrics = useMemo(() => {
    const avg = exams.length ? Math.round(exams.reduce((sum, e) => sum + Number(e.score || 0), 0) / exams.length) : 0;
    const best = exams.length ? Math.max(...exams.map((e) => Number(e.score || 0))) : 0;
    const focusMinutes = focusSessions.reduce((sum, s) => sum + Math.max(0, Number(s.duration_minutes || 0)), 0);
    const learningMinutes = learningEvents.reduce((sum, e) => sum + Math.max(0, Number(e.time_spent || 0)) / 60, 0);
    const completedTasks = tasks.filter((task) => task.completed).length;
    const taskRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;
    const totalXp = focusSessions.reduce((sum, s) => sum + Math.max(0, Number(s.xp_earned || 0)), 0);
    return { avg, best, focusMinutes: Math.round(focusMinutes), learningMinutes: Math.round(learningMinutes), completedTasks, taskRate, totalXp };
  }, [exams, focusSessions, learningEvents, tasks]);

  const subjectStats = useMemo(() => {
    const map = new Map<string, ExamResult[]>();
    for (const exam of exams) map.set(exam.subject, [...(map.get(exam.subject) ?? []), exam]);
    return [...map.entries()].map(([subject, rows]) => {
      const chronological = [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const avg = Math.round(rows.reduce((sum, e) => sum + Number(e.score || 0), 0) / rows.length);
      const delta = chronological.length > 1 ? Number(chronological.at(-1)?.score || 0) - Number(chronological[0]?.score || 0) : 0;
      return { subject, attempts: rows.length, avg, best: Math.max(...rows.map((e) => Number(e.score || 0))), trend: delta > 10 ? "improving" : delta < -10 ? "declining" : "stable" };
    }).sort((a, b) => b.attempts - a.attempts);
  }, [exams]);

  const syllabusCoverage = useMemo(() => rollUpSyllabusCoverage(mastery, topicUnits), [mastery, topicUnits]);

  const weakAreas = useMemo(() => {
    const counts = new Map<string, number>();
    exams.forEach((exam) => exam.weak_areas.forEach((area) => counts.set(area, (counts.get(area) ?? 0) + 1)));
    mastery.filter((topic) => Number(topic.mastery_score) < 60).forEach((topic) => counts.set(`${topic.subject} · ${topic.topic}`, (counts.get(`${topic.subject} · ${topic.topic}`) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [exams, mastery]);

  const activity = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return date;
    });
    return days.map((day) => {
      const key = day.toISOString().slice(0, 10);
      const matches = (value: string) => new Date(value).toISOString().slice(0, 10) === key;
      const focus = focusSessions.filter((s) => matches(s.created_at)).reduce((sum, s) => sum + Number(s.duration_minutes || 0), 0);
      const learning = learningEvents.filter((e) => matches(e.created_at)).reduce((sum, e) => sum + Number(e.time_spent || 0) / 60, 0);
      const examsTaken = exams.filter((e) => matches(e.created_at)).length;
      return { label: day.toLocaleDateString("en-GB", { weekday: "short" }), minutes: Math.round(focus + learning), exams: examsTaken };
    });
  }, [exams, focusSessions, learningEvents]);

  const exportData = exams.map((exam) => ({ id: exam.id, subject: exam.subject, topic: exam.topic, difficulty: exam.difficulty, scorePercent: Math.round(Number(exam.score || 0)), grade: getGrade(Number(exam.score || 0)).grade, correct: exam.correct_answers, questions: exam.total_questions, timeSeconds: exam.time_taken, weakAreas: exam.weak_areas, completedAt: exam.created_at }));
  const hasData = exams.length || focusSessions.length || learningEvents.length || tasks.length || mastery.length;
  const maxActivity = Math.max(...activity.map((day) => day.minutes), 1);

  if (loading) return <AnalyticsSkeleton />;
  if (error) return <AnalyticsError onRetry={() => setRetry((value) => value + 1)} />;

  const activitySummary = activity.map((day) => `${day.label} ${day.minutes} minutes${day.exams ? `, ${day.exams} exam${day.exams === 1 ? "" : "s"}` : ""}`).join("; ");

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--primary)]">Cortex Analytics</p>
          <h1 className="text-2xl font-extrabold sm:text-[28px]">Performance</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">A real picture of how you study, practise and perform.</p>
        </div>
        {exams.length > 0 && <ExportMenu filename="shadecode-performance" data={exportData} label="Export" exportType="performance_summary" sourceType="analytics" />}
      </div>

      {!hasData ? (
        <div className={`${CARD} px-6 py-11 text-center`}>
          <p aria-hidden="true" className="mb-3 text-5xl">📊</p>
          <p className="mb-2 text-[17px] font-extrabold">Your analytics will grow with you</p>
          <p className="mx-auto mb-[18px] max-w-[360px] text-sm text-[var(--muted-foreground)]">Complete an exam, start a focus session, or work through a task and the dashboard will start building your learning picture.</p>
          <button type="button" onClick={() => router.push("/exam-sim")} className="ssc-button min-h-11 px-5 font-bold">Start practising →</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: "Average score", value: exams.length ? `${metrics.avg}%` : "—", icon: "📊" },
              { label: "Best score", value: exams.length ? `${metrics.best}%` : "—", icon: "⭐" },
              { label: "Focus time", value: `${metrics.focusMinutes}m`, icon: "⏱" },
              { label: "Tasks complete", value: tasks.length ? `${metrics.taskRate}%` : "—", icon: "✓" },
            ].map((stat) => (
              <div key={stat.label} className="ssc-card p-3.5">
                <div className="mb-1.5 flex items-center gap-1.5"><span aria-hidden="true">{stat.icon}</span><span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--muted-foreground)]">{stat.label}</span></div>
                <p className="text-[25px] font-extrabold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className={CARD}>
            <div className="mb-3.5 flex justify-between gap-3">
              <div><p className={CARD_TITLE}>Study activity</p><p className={`${META} mt-0.5`}>Focus sessions + learning time, last 7 days</p></div>
              <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{metrics.focusMinutes + metrics.learningMinutes}m tracked</span>
            </div>
            <div role="img" aria-label={`Study activity, last 7 days: ${activitySummary}`} className="grid min-h-[130px] grid-cols-7 items-end gap-2">
              {activity.map((day) => (
                <div key={day.label} aria-hidden="true" className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] text-[var(--muted-foreground)]">{day.minutes ? `${day.minutes}m` : ""}</span>
                  <div title={`${day.minutes} minutes${day.exams ? ` · ${day.exams} exam${day.exams === 1 ? "" : "s"}` : ""}`} className={`w-full max-w-[34px] rounded-[7px] ${day.minutes ? "bg-[var(--primary)]" : "bg-[var(--muted)] opacity-55"}`} style={{ height: Math.max(8, Math.round((day.minutes / maxActivity) * 82)) }} />
                  <span className="text-[11px] text-[var(--muted-foreground)]">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          {subjectStats.length > 0 && <div className={CARD}>
            <p className={`${CARD_TITLE} mb-3.5`}>Performance by subject</p>
            <div className="flex flex-col gap-3.5">
              {subjectStats.map((stat) => {
                const { grade, color } = getGrade(stat.avg);
                const trend = stat.trend === "improving" ? "↑" : stat.trend === "declining" ? "↓" : "→";
                const trendLabel = stat.trend === "improving" ? "improving" : stat.trend === "declining" ? "declining" : "steady";
                const pct = Math.max(0, Math.min(100, stat.avg));
                return <div key={stat.subject}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-bold">{stat.subject}</span><span role="img" aria-label={trendLabel} className={`font-extrabold ${stat.trend === "declining" ? "text-[var(--danger)]" : "text-[var(--primary)]"}`}>{trend}</span></div>
                    <div className="flex shrink-0 items-center gap-2"><span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ background: tint(color, 14), color }}>{grade}</span><span className="text-[13px] font-extrabold">{stat.avg}%</span></div>
                  </div>
                  <div role="progressbar" aria-label={`${stat.subject} average score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
                  <p className={`${META} mt-1`}>{stat.attempts} attempt{stat.attempts === 1 ? "" : "s"} · best {stat.best}%</p>
                </div>;
              })}
            </div>
          </div>}

          {syllabusCoverage.length > 0 && <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
            {syllabusCoverage.map((coverage) => {
              const covered = Math.round((coverage.practisedSubsections / Math.max(1, coverage.totalSubsections)) * 100);
              return <div key={coverage.syllabusId} className={CARD}>
                <p className={`${CARD_TITLE} mb-1`}>Syllabus coverage · {coverage.syllabusId.replace("cambridge-", "")}</p>
                <p className="mb-3 text-xs text-[var(--muted-foreground)]">{coverage.practisedSubsections} of {coverage.totalSubsections} subsections practised · {coverage.averageMastery}% average</p>
                <div role="progressbar" aria-label="Syllabus coverage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={covered} className="mb-3 h-[5px] rounded-full bg-[var(--muted)]"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${covered}%` }} /></div>
                {coverage.weakest.map((item) => <div key={item.topicKey} className="flex items-center justify-between gap-2"><Link href={`/study/revise?syllabus=${coverage.syllabusId}&topic=${item.topicKey}`} className="inline-flex min-h-10 items-center text-[13px] font-semibold hover:underline" title="Revise this topic">{item.topicKey} {item.title} →</Link><span className={`shrink-0 text-xs font-extrabold ${item.mastery < 60 ? "text-[var(--danger)]" : "text-[var(--primary)]"}`}>{item.mastery}%</span></div>)}
              </div>;
            })}
          </div>}

          {(weakAreas.length > 0 || mastery.length > 0) && <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
            {weakAreas.length > 0 && <div className={CARD} style={{ borderColor: tint("var(--danger)", 25) }}>
              <p className={`${CARD_TITLE} mb-3`}>Needs attention</p>
              {weakAreas.map(([area, count]) => <div key={area} className="flex justify-between gap-2.5 border-b border-[var(--card-border)] py-[7px] last:border-b-0"><span className="text-[13px]">{area}</span><span className="shrink-0 self-start rounded-full px-[7px] py-0.5 text-[11px] font-extrabold text-[var(--danger)]" style={{ background: tint("var(--danger)", 12) }}>{count}×</span></div>)}
            </div>}
            {mastery.length > 0 && <div className={CARD}>
              <p className={`${CARD_TITLE} mb-3`}>Topic mastery</p>
              {mastery.slice(0, 5).map((topic) => {
                const score = Math.max(0, Math.min(100, Number(topic.mastery_score || 0)));
                return <div key={topic.id} className="mb-3 last:mb-0"><div className="mb-1.5 flex justify-between gap-2"><span className="text-[13px] font-semibold">{topic.topic}</span><span className="shrink-0 text-xs font-extrabold">{Math.round(Number(topic.mastery_score || 0))}%</span></div><div role="progressbar" aria-label={`${topic.topic} mastery`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} className="h-[5px] rounded-full bg-[var(--muted)]"><div className="h-full rounded-full" style={{ width: `${score}%`, background: Number(topic.mastery_score) < 60 ? "var(--danger)" : "var(--primary)" }} /></div><p className={`${META} mt-[3px]`}>{topic.subject}{topic.last_attempted ? ` · ${formatDate(topic.last_attempted)}` : ""}</p></div>;
              })}
            </div>}
          </div>}

          <div className={CARD}>
            <div className="grid grid-cols-3 gap-3">
              <div><p className={META}>Learning time</p><p className="mt-[3px] font-extrabold">{metrics.learningMinutes}m</p></div>
              <div><p className={META}>Learning events</p><p className="mt-[3px] font-extrabold">{learningEvents.length}</p></div>
              <div><p className={META}>Focus XP</p><p className="mt-[3px] font-extrabold">{metrics.totalXp}</p></div>
            </div>
          </div>

          {exams.length > 0 && <div className={CARD}>
            <div className="mb-3 flex items-center justify-between gap-2"><p className={CARD_TITLE}>Recent exams</p><button type="button" onClick={() => router.push("/exam-sim")} className="-mr-2 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-[var(--primary)] hover:underline">Practise more →</button></div>
            <div className="flex flex-col gap-2">
              {exams.slice(0, 10).map((exam) => {
                const score = Math.round(Number(exam.score || 0));
                const { grade, color } = getGrade(score);
                return <div key={exam.id} className="flex items-center gap-3 rounded-lg bg-[var(--muted)] px-3 py-2.5">
                  <div aria-label={`Grade ${grade}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg font-extrabold" style={{ background: tint(color, 14), color }}>{grade}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-bold">{exam.subject}{exam.topic ? ` · ${exam.topic}` : ""}</p><p className={`${META} mt-0.5`}>{exam.difficulty} · {formatDate(exam.created_at)} · {exam.correct_answers}/{exam.total_questions} correct</p></div>
                  <span className="shrink-0 text-base font-extrabold" style={{ color }}>{score}%</span>
                </div>;
              })}
            </div>
          </div>}
        </>
      )}
    </div>
  );
}
