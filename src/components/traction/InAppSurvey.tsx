"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/traction/client";

type Question = {
  id: string;
  type: "single" | "scale" | "text";
  label: string;
  options?: string[];
  min?: number;
  max?: number;
};

type Survey = {
  id: string;
  title: string;
  prompt: string;
  questions: Question[];
};

export default function InAppSurvey() {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    fetch("/api/surveys", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => data?.survey && setSurvey(data.survey))
      .catch(() => undefined);
  }, []);

  if (!survey || closed) return null;

  async function submit() {
    setBusy(true);
    try {
      const response = await fetch("/api/surveys/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surveyId: survey.id, answers }),
      });
      if (!response.ok) throw new Error("submit failed");
      await trackEvent("survey_completed", { surveyId: survey.id });
      setClosed(true);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-5 text-white shadow-2xl md:bottom-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Quick check-in</p>
          <h2 className="mt-1 text-lg font-bold">{survey.title}</h2>
          <p className="mt-1 text-sm text-zinc-300">{survey.prompt}</p>
        </div>
        <button aria-label="Close survey" onClick={() => setClosed(true)} className="text-zinc-400 hover:text-white">×</button>
      </div>

      <div className="space-y-4">
        {survey.questions.map((q) => (
          <div key={q.id}>
            <label className="mb-2 block text-sm font-medium">{q.label}</label>
            {q.type === "single" && (
              <div className="grid gap-2">
                {(q.options ?? []).map((option) => (
                  <button key={option} onClick={() => setAnswers((a) => ({ ...a, [q.id]: option }))} className={`rounded-xl border px-3 py-2 text-left text-sm ${answers[q.id] === option ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5"}`}>
                    {option}
                  </button>
                ))}
              </div>
            )}
            {q.type === "scale" && (
              <div className="flex gap-2">
                {Array.from({ length: (q.max ?? 5) - (q.min ?? 1) + 1 }, (_, i) => (q.min ?? 1) + i).map((value) => (
                  <button key={value} onClick={() => setAnswers((a) => ({ ...a, [q.id]: value }))} className={`h-10 w-10 rounded-full border text-sm ${answers[q.id] === value ? "border-cyan-400 bg-cyan-400/10" : "border-white/10 bg-white/5"}`}>{value}</button>
                ))}
              </div>
            )}
            {q.type === "text" && (
              <textarea value={String(answers[q.id] ?? "")} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-cyan-400" />
            )}
          </div>
        ))}
      </div>

      <button disabled={busy || Object.keys(answers).length === 0} onClick={submit} className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40">
        {busy ? "Saving…" : "Send feedback"}
      </button>
    </div>
  );
}
