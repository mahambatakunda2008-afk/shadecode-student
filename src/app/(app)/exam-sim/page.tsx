"use client";

import { useEffect, useState } from "react";
import ExamWorkspace from "@/components/exam/ExamWorkspace";

function decode(value: string | null) { if (!value) return ""; try { return decodeURIComponent(value); } catch { return value; } }

export default function ExamSimulationPage() {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  useEffect(() => { setParams(new URLSearchParams(window.location.search)); }, []);
  if (!params) return <div className="min-h-[60vh]" />;
  const subject = decode(params.get("subject") || params.get("sub"));
  return <ExamWorkspace initialSubject={subject} />;
}
