"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ExamWorkspace from "@/components/exam/ExamWorkspace";
import ExamAttemptLocalBridge from "@/components/exam/ExamAttemptLocalBridge";
import AcademicExamContext from "@/components/exam/AcademicExamContext";
import { examCompletedEvent, examStartedEvent, questionAttemptedEvent } from "@/lib/intelligence/emitLearningEvent";
import { trackEvent } from "@/lib/traction/client";
import type { ExamResults } from "@/lib/exam/types";

function decode(value: string | null) {
  if (!value) return "";
  try { return decodeURIComponent(value); } catch { return value; }
}

export default function ExamSimulationClient() {
  const router = useRouter();
  const params = useSearchParams();
  const examInstanceId = useRef(`exam-sim:${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`).current;
  const subject = decode(params.get("subject") || params.get("sub"));
  const topic = decode(params.get("topic"));
  const count = Number(params.get("count") || params.get("cnt") || 10);
  const safeCount = [5, 10, 15, 20].includes(count) ? count : 10;

  useEffect(() => {
    void examStartedEvent(examInstanceId, subject || undefined, topic || undefined);
    void trackEvent("exam_started", { examId: examInstanceId, subject: subject || null, topic: topic || null, questionCount: safeCount });
  }, [examInstanceId, safeCount, subject, topic]);

  const handleFinished = (result: ExamResults) => {
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

  return <ExamAttemptLocalBridge subject={subject} topic={topic} count={safeCount} level={1}><AcademicExamContext /><ExamWorkspace initialSubject={subject} initialTopic={topic} initialQuestionCount={safeCount} onExit={() => router.push("/dashboard")} onFinished={handleFinished} /></ExamAttemptLocalBridge>;
}
