import { Suspense } from "react";
import ExamSimulationClient from "./ExamSimulationClient";

function Fallback() {
  return <div className="min-h-[60vh]" aria-label="Loading exam simulation" />;
}

export default function ExamSimulationPage() {
  return <Suspense fallback={<Fallback />}><ExamSimulationClient /></Suspense>;
}
