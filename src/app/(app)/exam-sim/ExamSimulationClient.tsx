"use client";

import { useSearchParams, useRouter } from "next/navigation";
import ExamWorkspace from "@/components/exam/ExamWorkspace";
import AcademicExamContext from "@/components/exam/AcademicExamContext";
import { examCompletedEvent } from "@/lib/intelligence/emitLearningEvent";
import type { ExamResults } from "@/components/exam/ExamWorkspace";

function decode(value: string | null) { if (!value) return ""; try { return decodeURIComponent(value); } catch { return value; } }

export default function ExamSimulationClient() {
  const router = useRouter();
  const params = useSearchParams();
  const subject = decode(params.get("subject") || params.get("sub"));
  const topic = decode(params.get("topic"));
  const count = Number(params.get("count") || params.get("cnt") || 10);
  const difficultyParam = decode(params.get("difficulty") || params.get("dif")).toLowerCase();
  const difficulty = difficultyParam.includes("university") || difficultyParam.includes("challenge") ? 2 : difficultyParam.includes("a-level") || difficultyParam.includes("advanced") ? 1 : 0;
  const examId = `exam-sim:${subject || "general"}:${topic || "general"}:${count}:${difficulty}`;
  const handleFinished = (result: ExamResults) => {
    void examCompletedEvent(examId, subject || undefined, topic || undefined, {
      percentage: result.percentage,
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      timeTaken: result.timeTaken,
      questionCount: result.results.length,
    });
  };
  return <><AcademicExamContext /><ExamWorkspace initialSubject={subject} initialTopic={topic} initialDifficulty={difficulty} initialQuestionCount={[5, 10, 15, 20].includes(count) ? count : 10} onExit={() => router.push("/dashboard")} onFinished={handleFinished} /></>;
}