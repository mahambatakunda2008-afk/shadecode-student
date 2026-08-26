"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getLearnerExamLevel, canGenerateExamForSubject } from "@/lib/exam/learnerExamOptions";
import type { LearnerContext } from "@/lib/learner/context";

export default function ExamWorkspace({ initialSubject = "" }: { initialSubject?: string }) {
  const [context, setContext] = useState<LearnerContext | null>(null);
  const [subject, setSubject] = useState(initialSubject);
  const [calculator, setCalculator] = useState("");
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await createClient().auth.getSession();
      if (!data.session?.access_token) return;
      const res = await fetch("/api/learner/context", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (!res.ok) return;
      const learner = (await res.json()) as LearnerContext;
      setContext(learner);
      if (!initialSubject && learner.subjects[0]) setSubject(learner.subjects[0]);
    })();
  }, [initialSubject]);

  const examLevel = useMemo(() => context ? getLearnerExamLevel(context) : null, [context]);
  const subjects = context?.subjects ?? [];

  function calculate() {
    const expression = calculator.trim();
    if (!expression) return setCalcResult(null);
    if (!/^[0-9+\-*/().%\s]+$/.test(expression)) return setCalcResult("Only basic arithmetic is supported here.");
    try {
      const value = Function(`"use strict"; return (${expression})`)();
      setCalcResult(Number.isFinite(value) ? String(value) : "Invalid result");
    } catch {
      setCalcResult("Check the expression.");
    }
  }

  function validateSubject() {
    if (!context) return false;
    if (!canGenerateExamForSubject(context, subject)) {
      setError("Choose a subject from your enrolled subjects.");
      return false;
    }
    setError(null);
    return true;
  }

  return (
    <section className="space-y-5 rounded-2xl border p-5">
      <header>
        <h2 className="text-2xl font-semibold">Exam simulation</h2>
        <p className="text-sm opacity-70">
          {examLevel ? `${examLevel.label} • ${examLevel.curriculum}` : "Loading your academic profile…"}
        </p>
      </header>

      <label className="block">
        Subject
        <select
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="mt-1 w-full rounded-xl border p-2"
          disabled={!context}
        >
          {subjects.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>

      <button type="button" onClick={validateSubject} className="rounded-xl border px-4 py-2">
        Validate exam scope
      </button>

      {error && <p role="alert" className="rounded-xl border p-3">{error}</p>}

      <div className="rounded-2xl border p-4">
        <h3 className="mb-3 font-semibold"><Calculator className="mr-2 inline h-4 w-4" />Calculator</h3>
        <div className="flex gap-2">
          <input
            value={calculator}
            onChange={(event) => setCalculator(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") calculate(); }}
            placeholder="e.g. (12.5 * 4) / 2"
            aria-label="Calculator expression"
            className="min-w-0 flex-1 rounded-xl border px-3 py-2"
          />
          <button type="button" onClick={calculate} className="rounded-xl border px-4 py-2">Calculate</button>
        </div>
        {calcResult !== null && <output className="mt-3 block rounded-xl border p-3 font-mono" aria-live="polite">{calcResult}</output>}
      </div>
    </section>
  );
}
