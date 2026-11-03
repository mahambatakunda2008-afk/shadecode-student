"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Eye, EyeOff, FlaskConical, RotateCcw, Save, Target } from "lucide-react";
import practiceData from "@/lib/curriculum/practice/biology-9700-practical-practice-2028-2030.json";
import {
  canAttemptPracticalSet,
  ratePracticalSkill,
  revealPracticalGuidance,
  savePracticalAnswer,
  selfAwardPracticalMarks,
  startPracticalAttempt,
  summarizePracticalAttempt,
  togglePracticalAnswerPoint,
  type PracticalAttempt,
  type PracticalPracticeSet,
  type PracticeSkillRating,
} from "@/lib/curriculum/practice/biology-practical-attempt";

type Question = { id: string; marks: number; prompt: string; answer: string[] };
type Task = { id: string; paper: "Paper 3" | "Paper 5"; title: string; format: string; skills: string[]; scenario: string; questions: Question[]; markingGuide?: { totalPracticeMarks: number; principle: string } };
type PracticeSet = PracticalPracticeSet & { title: string; assessmentNotice: string; tasks: Task[] };

const set = practiceData as PracticeSet;
const STORAGE_KEY = `shadecode:practical-attempt:${set.id}`;

function readAttempt(): PracticalAttempt {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PracticalAttempt;
        if (parsed.practiceSetId === set.id && parsed.answers && parsed.skillRatings) return { ...parsed, checkedAnswerPoints: parsed.checkedAnswerPoints ?? {} };
      }
    } catch { /* Start clean if local storage is unavailable or malformed. */ }
  }
  return startPracticalAttempt(set);
}

export default function PracticalPracticeClient() {
  const [attempt, setAttempt] = useState<PracticalAttempt>(() => startPracticalAttempt(set));
  const [ready, setReady] = useState(false);
  const [activeTask, setActiveTask] = useState(set.tasks[0]?.id ?? "");
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    setAttempt(readAttempt());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt)); } catch { /* The session remains usable without persistence. */ }
  }, [attempt, ready]);

  const summary = useMemo(() => summarizePracticalAttempt(set, attempt), [attempt]);
  const task = set.tasks.find((item) => item.id === activeTask) ?? set.tasks[0];

  const updateAnswer = (taskId: string, questionId: string, value: string) => {
    setAttempt((current) => savePracticalAnswer(set, current, taskId, questionId, value));
  };
  const updateRating = (taskId: string, skill: string, rating: PracticeSkillRating) => {
    setAttempt((current) => ratePracticalSkill(set, current, taskId, skill, rating));
  };
  const openRecommendation = (taskId: string) => {
    setActiveTask(taskId);
    setShowReview(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    if (!window.confirm("Clear this practical practice attempt from this device?")) return;
    setAttempt(startPracticalAttempt(set));
    setShowReview(false);
  };

  if (!canAttemptPracticalSet(set)) {
    return <main className="min-h-[70vh] bg-[var(--background)] p-6 text-[var(--foreground)]"><div className="mx-auto max-w-2xl rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-6"><h1 className="text-xl font-bold">Practice set unavailable</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">This material has not been cleared for learner access.</p></div></main>;
  }

  if (!task) return null;

  return (
    <main className="min-h-full bg-[var(--background)] px-4 py-6 pb-24 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]"><FlaskConical size={15} /> Practical skills studio</div>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Biology practical practice</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">Work through original Cambridge 9700-style practical tasks. Write your own answers, reveal the self-check points when ready, then review the skills you need to strengthen.</p></div>
            <button type="button" onClick={reset} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[var(--card-border)] px-3 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--surface)] sm:self-auto"><RotateCcw size={15} /> Reset attempt</button>
          </div>
          <p className="rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 py-3 text-xs leading-5 text-[var(--muted-foreground)]">{set.assessmentNotice} Your answers are saved on this device only.</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-4" aria-label="Attempt progress">
          {[
            { label: "Questions answered", value: `${summary.answeredQuestions}/${summary.totalQuestions}`, icon: BookOpenCheck },
            { label: "Guidance revealed", value: String(summary.revealedQuestions), icon: Eye },
            { label: "Self-check marks", value: `${summary.selfAwardedMarks}/${summary.availableMarks}`, icon: Target },
            { label: "Skills to revisit", value: String(summary.skillsToRevisit.length), icon: ClipboardList },
          ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4"><div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]"><Icon size={15} />{label}</div><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p></div>)}
        </section>

        <section className="grid gap-3 sm:grid-cols-2" aria-label="Paper coverage">
          {(["Paper 3", "Paper 5"] as const).map((paper) => {
            const coverage = summary.paperCoverage[paper];
            const percentage = coverage.questionCount ? Math.round((coverage.answeredQuestions / coverage.questionCount) * 100) : 0;
            return <div key={paper} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold">{paper} coverage</h2><span className="text-xs font-semibold tabular-nums text-[var(--muted-foreground)]">{percentage}% answered</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${percentage}%` }} /></div>
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[var(--muted-foreground)]"><span>{coverage.answeredQuestions}/{coverage.questionCount} questions</span><span>{coverage.taskCount} tasks</span><span>{coverage.selfAwardedMarks}/{coverage.availableMarks} self-awarded</span></div>
            </div>;
          })}
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-2">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Practice tasks</h2>
            {set.tasks.map((item, index) => {
              const isActive = item.id === task.id;
              const answered = item.questions.filter((q) => Boolean(attempt.answers[`${item.id}::${q.id}`]?.trim())).length;
              return <button key={item.id} type="button" onClick={() => setActiveTask(item.id)} aria-current={isActive ? "step" : undefined} className={`w-full rounded-2xl border p-4 text-left transition ${isActive ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)] bg-[var(--surface)] hover:border-[var(--primary)]/50"}`}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)]">{item.paper} · Task {index + 1}</span>
                <span className="mt-1 block text-sm font-semibold">{item.title}</span>
                <span className="mt-2 block text-xs text-[var(--muted-foreground)]">{answered}/{item.questions.length} answered</span>
              </button>;
            })}
            <button type="button" onClick={() => setShowReview((value) => !value)} className="mt-3 flex min-h-11 w-full items-center justify-between rounded-xl border border-[var(--card-border)] bg-[var(--surface)] px-4 text-sm font-semibold"><span className="flex items-center gap-2"><Target size={16} /> Skill review</span>{showReview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[var(--primary-glow)] px-3 py-1 text-[11px] font-bold text-[var(--primary)]">{task.paper}</span><span className="text-xs text-[var(--muted-foreground)]">{task.format}</span></div>
              <h2 className="mt-3 text-xl font-bold">{task.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{task.scenario}</p>
            </div>

            {task.questions.map((question, index) => {
              const key = `${task.id}::${question.id}`;
              const revealed = attempt.revealedAnswers.includes(key);
              return <article key={question.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Question {index + 1}</p><h3 className="mt-2 text-sm font-semibold leading-6">{question.prompt}</h3></div><span className="shrink-0 rounded-lg bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold tabular-nums">{question.marks} marks</span></div>
                <label className="mt-4 block"><span className="sr-only">Your answer to question {index + 1}</span><textarea value={attempt.answers[key] ?? ""} onChange={(event) => updateAnswer(task.id, question.id, event.target.value)} rows={4} placeholder="Write your answer here…" className="w-full resize-y rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-3 text-sm leading-6 outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15" /></label>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setAttempt((current) => revealPracticalGuidance(set, current, task.id, question.id))} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold hover:bg-[var(--surface-2)]">{revealed ? <EyeOff size={14} /> : <Eye size={14} />}{revealed ? "Guidance revealed" : "Reveal self-check points"}</button>
                  <label className="ml-auto flex items-center gap-2 text-xs text-[var(--muted-foreground)]">My marks <input type="number" min={0} max={question.marks} step={1} value={attempt.selfAwardedMarks[key] ?? ""} onChange={(event) => { const value = event.target.value; if (value === "") { setAttempt((current) => ({ ...current, selfAwardedMarks: Object.fromEntries(Object.entries(current.selfAwardedMarks).filter(([savedKey]) => savedKey !== key)) })); return; } const parsed = Number(value); if (Number.isInteger(parsed) && parsed >= 0 && parsed <= question.marks) setAttempt((current) => selfAwardPracticalMarks(set, current, task.id, question.id, parsed)); }} className="h-9 w-16 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-2 text-center text-sm font-semibold tabular-nums text-[var(--foreground)]" /></label>
                </div>
                {revealed && <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--background)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">Answer-quality checklist</p><span className="text-[11px] text-[var(--muted-foreground)]">{(attempt.checkedAnswerPoints[key] ?? []).length}/{question.answer.length} points reviewed</span></div><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Compare each point with your answer and tick it only if you included the idea accurately. These are guidance points, not individually weighted marks.</p><ul className="mt-3 space-y-3 text-sm leading-6">{question.answer.map((point, pointIndex) => { const checked = (attempt.checkedAnswerPoints[key] ?? []).includes(pointIndex); return <li key={pointIndex}><label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={checked} onChange={() => setAttempt((current) => togglePracticalAnswerPoint(set, current, task.id, question.id, pointIndex))} className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]" /><span className={checked ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>{point}</span></label></li>; })}</ul><p className="mt-3 text-xs font-semibold text-[var(--muted-foreground)]">Still unchecked? Add the missing idea to your answer, then retry without looking.</p></div>}
              </article>;
            })}

            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5">
              <div className="flex items-center gap-2"><Target size={17} className="text-[var(--primary)]" /><h3 className="font-semibold">Rate your practical skills</h3></div>
              <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Be honest. These ratings help you decide what to practise next.</p>
              <div className="mt-4 divide-y divide-[var(--card-border)]">
                {task.skills.map((skill) => {
                  const current = attempt.skillRatings[`${task.id}::${skill}`];
                  return <div key={skill} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm font-medium">{skill}</span><div className="flex flex-wrap gap-2">{(["secure", "developing", "revisit"] as const).map((rating) => <button key={rating} type="button" aria-pressed={current === rating} onClick={() => updateRating(task.id, skill, rating)} className={`min-h-9 rounded-lg border px-3 text-xs font-semibold capitalize transition ${current === rating ? "border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--primary)]" : "border-[var(--card-border)] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"}`}>{rating}</button>)}</div></div>;
                })}
              </div>
            </div>
          </section>
        </div>

        {showReview && <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-center gap-2"><ClipboardList size={18} className="text-[var(--primary)]" /><h2 className="text-lg font-bold">Your skill review</h2></div><p className="mt-1 text-sm text-[var(--muted-foreground)]">This is a self-assessment, not an automated judgement of your written answers.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{summary.skills.map((skill) => <div key={skill.skill} className="rounded-xl bg-[var(--background)] px-3 py-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{skill.skill}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${skill.rating === "secure" ? "bg-emerald-500/10 text-emerald-600" : skill.rating === "developing" ? "bg-amber-500/10 text-amber-600" : "bg-[var(--surface-2)] text-[var(--muted-foreground)]"}`}>{skill.rating.replace("-", " ")}</span></div><p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Reviewed in {skill.reviewedTaskCount}/{skill.totalTaskCount} tasks</p><div className="mt-2 flex flex-wrap gap-1.5">{skill.taskIds.map((taskId) => { const taskReview = skill.taskRatings[taskId]; const taskTitle = set.tasks.find((item) => item.id === taskId)?.title ?? taskId; return <span key={taskId} className="rounded-md border border-[var(--card-border)] px-2 py-1 text-[10px] text-[var(--muted-foreground)]">{taskTitle}: {taskReview.replace("-", " ")}</span>; })}</div></div>)}</div><div className="mt-4 rounded-xl border border-[var(--card-border)] p-4"><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">Recommended next practice</p>{summary.recommendedPractice.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{summary.recommendedPractice.map((item) => <div key={item.skill} className="rounded-xl bg-[var(--background)] p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{item.skill}</span><span className="text-[10px] font-bold uppercase text-[var(--muted-foreground)]">{item.rating.replace("-", " ")}</span></div><p className="mt-1 text-xs font-medium">{item.taskTitle}</p><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{item.reason}</p><button type="button" onClick={() => openRecommendation(item.taskId)} className="mt-3 min-h-9 rounded-lg border border-[var(--card-border)] px-3 text-xs font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)]">Open task · Question {item.questionId}</button></div>)}</div> : <p className="mt-2 text-sm leading-6">No skills currently flagged for review. Keep practising to maintain them.</p>}</div></section>}

        <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]"><span className="flex items-center gap-2"><Save size={14} />{ready ? "Saved on this device" : "Loading saved attempt…"}</span><span className="flex items-center gap-1"><CheckCircle2 size={14} /> Works without AI or a live connection after the page loads</span></footer>
      </div>
    </main>
  );
}
