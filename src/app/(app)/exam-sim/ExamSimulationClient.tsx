"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ExamWorkspace from "@/components/exam/ExamWorkspace";
import ExamAttemptLocalBridge from "@/components/exam/ExamAttemptLocalBridge";
import AcademicExamContext from "@/components/exam/AcademicExamContext";
import { examCompletedEvent, examStartedEvent, questionAttemptedEvent } from "@/lib/intelligence/emitLearningEvent";
import { trackEvent } from "@/lib/traction/client";
import { createClient } from "@/lib/supabase/client";
import { matchAllowedSubject, isGeneralSubject } from "@/lib/academic/subjectContract";
import type { ExamResults } from "@/lib/exam/types";

function decode(value: string | null) {
  if (!value) return "";
  try { return decodeURIComponent(value); } catch { return value; }
}

export default function ExamSimulationClient() {
  const router = useRouter();
  const params = useSearchParams();
  const examInstanceId = useRef(`exam-sim:${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`).current;
  const requestedSubject = decode(params.get("subject") || params.get("sub"));
  const topic = decode(params.get("topic"));
  const count = Number(params.get("count") || params.get("cnt") || 10);
  const safeCount = [5, 10, 15, 20].includes(count) ? count : 10;
  const challengeId = decode(params.get("cid"));
  const challengerName = decode(params.get("cname")) || "your friend";
  const [subject, setSubject] = useState("");
  const [battle, setBattle] = useState<{ won: boolean; percentage: number } | null>(null);
  const [subjectReady, setSubjectReady] = useState(!requestedSubject);

  useEffect(() => {
    let cancelled = false;
    const resolveSubject = async () => {
      if (!requestedSubject) {
        setSubject("");
        setSubjectReady(true);
        return;
      }
      if (isGeneralSubject(requestedSubject)) {
        setSubject("");
        setSubjectReady(true);
        return;
      }
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setSubject("");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("subjects")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        const match = matchAllowedSubject(requestedSubject, profile?.subjects);
        setSubject(match ?? "");
      } catch {
        if (!cancelled) setSubject("");
      } finally {
        if (!cancelled) setSubjectReady(true);
      }
    };
    void resolveSubject();
    return () => { cancelled = true; };
  }, [requestedSubject]);

  useEffect(() => {
    if (!subjectReady) return;
    void examStartedEvent(examInstanceId, subject || undefined, topic || undefined);
    void trackEvent("exam_started", { examId: examInstanceId, subject: subject || null, topic: topic || null, questionCount: safeCount });
  }, [examInstanceId, safeCount, subject, subjectReady, topic]);

  const handleFinished = (result: ExamResults) => {
    if (challengeId) {
      // Server decides the winner from the stored challenge score; the browser only reports its own result.
      void fetch("/api/challenge/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge_id: challengeId, percentage: result.percentage, total_score: result.totalScore, max_score: result.maxScore, time_taken: result.timeTaken }),
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { won?: boolean } | null) => { if (data && typeof data.won === "boolean") setBattle({ won: data.won, percentage: result.percentage }); })
        .catch(() => undefined);
    }
    for (const question of result.results) {
      void questionAttemptedEvent(examInstanceId, question.questionId, subject || undefined, question.topic || topic || undefined, {
        correct: question.correct,
        score: question.score,
        maxScore: question.maxScore,
        percentage: question.maxScore > 0 ? Math.round((question.score / question.maxScore) * 100) : 0,
      });
    }
    void examCompletedEvent(examInstanceId, subject || undefined, topic || undefined, {
      percentage: result.percentage,
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      timeTaken: result.timeTaken,
      questionCount: result.results.length,
      aggregateOnly: true,
    });
    void trackEvent("exam_completed", { examId: examInstanceId, subject: subject || null, topic: topic || null, percentage: result.percentage, questionCount: result.results.length });
  };

  if (!subjectReady) {
    return <main className="grid min-h-[60vh] place-items-center bg-[var(--background)] text-sm text-[var(--muted-foreground)]">Preparing your subjects…</main>;
  }

  return <>
    <ExamAttemptLocalBridge subject={subject} topic={topic} count={safeCount} level={1}><AcademicExamContext /><ExamWorkspace initialSubject={subject} initialTopic={topic} initialQuestionCount={safeCount} onExit={() => router.push("/dashboard")} onFinished={handleFinished} /></ExamAttemptLocalBridge>;
    {battle && challengeId && (
      <aside role="status" aria-live="polite" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-[var(--card)] p-5 shadow-lg backdrop-blur">
        <p className="text-sm font-semibold text-[var(--foreground)]">{battle.won ? `You beat ${challengerName}!` : `${challengerName} takes this one.`}</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">You scored {battle.percentage}%. {battle.won ? "Share the win and send a rematch." : "Review your weak topics, then challenge them back."}</p>
        <a href={`/challenge/${challengeId}`} className="mt-3 inline-flex h-10 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] transition-opacity hover:opacity-90">See the challenge</a>
      </aside>
    )}
  </>
}
