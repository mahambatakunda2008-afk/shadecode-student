"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, RotateCcw, Target, X, Zap } from "lucide-react";
import { executeCode } from "@/lib/code-lab/runtime";

type Question =
  | { id: string; kind: "trace"; title: string; prompt: string; code: string; input: string; expected: string; explanation: string }
  | { id: string; kind: "debug"; title: string; prompt: string; code: string; input: string; expected: string; explanation: string }
  | { id: string; kind: "choice"; title: string; prompt: string; options: string[]; answer: string; explanation: string };

const QUESTIONS: Question[] = [
  { id: "trace-1", kind: "trace", title: "Trace the loop", prompt: "What is the final value of Total?", code: "DECLARE Total : INTEGER\nTotal ← 0\nFOR Count ← 1 TO 4\n    Total ← Total + Count\nNEXT Count\nOUTPUT Total", input: "", expected: "10", explanation: "The values added are 1 + 2 + 3 + 4, giving 10." },
  { id: "trace-2", kind: "trace", title: "Trace a decision", prompt: "What is output for input 50?", code: "DECLARE Mark : INTEGER\nINPUT Mark\nIF Mark >= 50 THEN\n    OUTPUT \"Pass\"\nELSE\n    OUTPUT \"Fail\"\nENDIF", input: "50", expected: "Pass", explanation: "50 satisfies Mark >= 50, so the TRUE branch executes." },
  { id: "trace-3", kind: "trace", title: "Array trace", prompt: "What is output?", code: "DECLARE Data : ARRAY[1:3] OF INTEGER\nINPUT Data[1]\nINPUT Data[2]\nINPUT Data[3]\nOUTPUT Data[2]", input: "7\n12\n5", expected: "12", explanation: "The second array element is Data[2] = 12." },
  { id: "debug-1", kind: "debug", title: "Boundary bug", prompt: "Fix the algorithm so it outputs Pass exactly when Mark is 50 or more.", code: "DECLARE Mark : INTEGER\nINPUT Mark\nIF Mark > 50 THEN\n    OUTPUT "Pass"\nELSE\n    OUTPUT "Fail"\nENDIF", input: "50", expected: "Pass", explanation: "The boundary condition must include 50, so > must become >=." },
  { id: "debug-2", kind: "debug", title: "Off-by-one", prompt: "Fix the loop so all five array elements are processed.", code: "DECLARE Data : ARRAY[1:5] OF INTEGER\nFOR Index ← 1 TO 4\n    INPUT Data[Index]\nNEXT Index\nOUTPUT Data[5]", input: "1\n2\n3\n4\n5", expected: "5", explanation: "The loop must run from 1 TO 5, otherwise Data[5] is never input." },
  { id: "choice-1", kind: "choice", title: "Search choice", prompt: "Which algorithm requires the data to be sorted before searching?", options: ["Linear search", "Binary search", "Bubble sort", "Insertion sort"], answer: "Binary search", explanation: "Binary search discards half of the remaining search range after each comparison, so the ordering must be known." },
  { id: "choice-2", kind: "choice", title: "Loop choice", prompt: "Which loop is most directly suited to repeating exactly 20 times?", options: ["IF", "CASE", "FOR", "REPEAT UNTIL"], answer: "FOR", explanation: "A count-controlled FOR loop directly expresses a known number of iterations." },
  { id: "choice-3", kind: "choice", title: "Complexity", prompt: "A single loop runs once for every item in an input array. What is the usual time complexity?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: "O(n)", explanation: "The work grows proportionally with the number of input items." },
];

function normalise(value: string) {
  return value.trim().replace(/\r\n/g, "\n");
}

export default function AlgorithmAssessmentPanel() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);

  const question = QUESTIONS[index];
  const progress = useMemo(() => Math.round((completed.length / QUESTIONS.length) * 100), [completed.length]);

  const submit = async () => {
    if (!answer.trim() || busy) return;
    setBusy(true);
    let correct = false;
    if (question.kind === "choice" || question.kind === "trace") {
      correct = normalise(answer) === normalise(question.kind === "choice" ? question.answer : question.expected);
    } else {
      const result = await executeCode({
        id: "algorithm-assessment-" + question.id,
        language: "pseudocode",
        code: answer,
        entryFile: "main.pseudo",
        inputs: question.input.split(/\r?\n/).filter(Boolean),
        timeoutMs: 5000,
      });
      const actual = normalise(result.events.filter(event => event.type === "stdout").map(event => event.text).join("\n"));
      correct = result.exitCode === 0 && actual === normalise(question.expected);
    }
    setFeedback(correct ? "correct" : "wrong");
    if (correct && !completed.includes(question.id)) {
      setScore(value => value + 1);
      setCompleted(value => [...value, question.id]);
    }
    setBusy(false);
  };

  const next = () => {
    setIndex(value => (value + 1) % QUESTIONS.length);
    setAnswer("");
    setFeedback(null);
  };

  const reset = () => {
    setIndex(0);
    setAnswer("");
    setFeedback(null);
    setBusy(false);
    setScore(0);
    setCompleted([]);
  };

  return (
    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]"><Target className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">9618 assessment mode</div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Trace · Debug · Choose</h2>
        </div>
        <div className="text-right"><div className="text-lg font-bold text-[var(--foreground)]">{score}/{QUESTIONS.length}</div><div className="text-[9px] text-[var(--muted-foreground)]">{progress}% complete</div></div>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: progress + "%" }} /></div>

      <div className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-2)] p-4">
        <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-[9px] uppercase tracking-wider text-[var(--muted-foreground)]">{question.kind}</span><span className="text-[9px] text-[var(--muted-foreground)]">{index + 1} / {QUESTIONS.length}</span></div>
        <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">{question.title}</h3>
        <p className="mt-2 text-xs leading-5 text-[var(--muted-foreground)]">{question.prompt}</p>

        {"code" in question && (
          <pre className="mt-4 overflow-auto rounded-xl border border-[var(--card-border)] bg-[#070a10] p-3 font-mono text-[11px] leading-5 text-slate-300">{question.code}</pre>
        )}

        {question.kind === "choice" ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {question.options.map(option => <button key={option} type="button" onClick={() => setAnswer(option)} className={`rounded-xl border p-3 text-left text-xs transition ${answer === option ? "border-[var(--primary)] bg-[var(--primary-glow)]" : "border-[var(--card-border)] hover:bg-[var(--surface)]"}`}>{option}</button>)}
          </div>
        ) : (
          <textarea value={answer} onChange={event => setAnswer(event.target.value)} spellCheck={false} placeholder={question.kind === "trace" ? "Enter the final output/value..." : "Write the corrected pseudocode here..."} className="mt-4 min-h-36 w-full rounded-xl border border-[var(--card-border)] bg-[#070a10] p-3 font-mono text-[11px] leading-5 text-slate-200 outline-none focus:ring-2 focus:ring-[var(--primary)]" />
        )}

        {feedback && (
          <div className={`mt-4 rounded-xl border p-3 text-xs ${feedback === "correct" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300" : "border-red-500/20 bg-red-500/5 text-red-300"}`}>
            <div className="flex items-center gap-2 font-semibold">{feedback === "correct" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}{feedback === "correct" ? "Correct" : "Not yet"}</div>
            <p className="mt-1 leading-5">{question.explanation}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={submit} disabled={!answer.trim() || busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-[10px] font-semibold text-white disabled:opacity-50"><Zap className="h-3.5 w-3.5" />{busy ? "Checking..." : "Check answer"}</button>
          <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-2 text-[10px] font-semibold text-[var(--foreground)]">Next <ChevronRight className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-transparent px-4 py-2 text-[10px] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"><RotateCcw className="h-3.5 w-3.5" />Reset</button>
        </div>
      </div>
    </section>
  );
}
