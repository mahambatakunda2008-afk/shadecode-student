"use client";

import { useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ExamWorkspace from "@/components/exam/ExamWorkspace";
import ExamAttemptLocalBridge from "@/components/exam/ExamAttemptLocalBridge";
import AcademicExamContext from "@/components/exam/AcademicExamContext";
import { examCompletedEvent } from "@/lib/intelligence/emitLearningEvent";
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

  const handleFinished = (result: ExamResults) => {
    void examCompletedEvent(examInstanceId, subject || undefined, topic || undefined, {
      percentage: result.percentage,
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      timeTaken: result.timeTaken,
      questionCount: result.results.length,
    });
  };

  return (
    <ExamAttemptLocalBridge subject={subject} topic={topic} count={safeCount} level={1}>
      <AcademicExamContext />
      <ExamWorkspace
        initialSubject={subject}
        initialTopic={topic}
        initialQuestionCount={safeCount}
        onExit={() => router.push("/dashboard")}
        onFinished={handleFinished}
      />
    </ExamAttemptLocalBridge>
  );
}
