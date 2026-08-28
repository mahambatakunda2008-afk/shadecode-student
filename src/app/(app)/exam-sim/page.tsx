"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ExamWorkspace from "@/components/exam/ExamWorkspace";
import AcademicExamContext from "@/components/exam/AcademicExamContext";

function decode(value: string | null) { if (!value) return ""; try { return decodeURIComponent(value); } catch { return value; } }

export default function ExamSimulationPage() {
  const router = useRouter();
  const [params, setParams] = useState<URLSearchParams | null>(null);
  useEffect(() => { setParams(new URLSearchParams(window.location.search)); }, []);
  if (!params) return <div className="min-h-[60vh]" />;
  const subject = decode(params.get("subject") || params.get("sub"));
  const topic = decode(params.get("topic"));
  const count = Number(params.get("count") || params.get("cnt") || 10);
  const difficultyParam = decode(params.get("difficulty") || params.get("dif")).toLowerCase();
  const difficulty = difficultyParam.includes("university") || difficultyParam.includes("challenge") ? 2 : difficultyParam.includes("a-level") || difficultyParam.includes("advanced") ? 1 : 0;
  return (
    <>
      <AcademicExamContext />
      <ExamWorkspace initialSubject={subject} initialTopic={topic} initialDifficulty={difficulty} initialQuestionCount={[5, 10, 15, 20].includes(count) ? count : 10} onExit={() => router.push("/dashboard")} />
    </>
  );
}
