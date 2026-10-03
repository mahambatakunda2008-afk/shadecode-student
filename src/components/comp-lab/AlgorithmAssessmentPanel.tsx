"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, RotateCcw, Target, X, Zap } from "lucide-react";
import { executeCode } from "@/lib/code-lab/runtime";

type TestCase = { input: string; expected: string };

type Question =
  | { id: string; kind: "trace"; title: string; prompt: string; code: string; input: string; expected: string; explanation: string }
  | { id: string; kind: "debug"; title: string; prompt: string; code: string; input: string; expected: string; hiddenTests: TestCase[]; explanation: string }
  | { id: string; kind: "choice"; title: string; prompt: string; options: string[]; answer: string; explanation: string };

const QUESTIONS: Question[] = [
  { id: "trace-1", kind: "trace", title: "Trace the loop", prompt: "What is the final value of Total?", code: "DECLARE Total : INTEGER\nTotal ← 0\nFOR Count ← 1 TO 4\n    Total ← Total + Count\nNEXT Count\nOUTPUT Total", input: "", expected: "10", explanation: "The values added are 1 + 2 + 3 + 4, giving 10." },
  { id: "trace-2", kind: "trace", title: "Trace a decision", prompt: "What is output for input 50?", code: "DECLARE Mark : INTEGER\nINPUT Mark\nIF Mark >= 50 THEN\n    OUTPUT \"Pass\"\nELSE\n    OUTPUT \"Fail\"\nENDIF", input: "50", expected: "Pass", explanation: "50 satisfies Mark >= 50, so the TRUE branch executes." },
  { id: "trace-3", kind: "trace", title: "Array trace", prompt: "What is output?", code: "DECLARE Data : ARRAY[1:3] OF INTEGER\nINPUT Data[1]\nINPUT Data[2]\nINPUT Data[3]\nOUTPUT Data[2]", input: "7\n12\n5", expected: "12", explanation: "The second array element is Data[2] = 12." },
  { id: "debug-1", kind: "debug", title: "Boundary bug", prompt: "Fix the algorithm so it outputs Pass exactly when Mark is 50 or more.", code: "DECLARE Mark : INTEGER\nINPUT Mark\nIF Mark > 50 THEN\n    OUTPUT \"Pass\"\nELSE\n    OUTPUT \"Fail\"\nENDIF", input: "50", expected: "Pass", hiddenTests: [{ input: "49", expected: "Fail" }, { input: "51", expected: "Pass" }, { input: "0", expected: "Fail" }], explanation: "The boundary condition must include 50, so > must become >=. Hidden cases also check that the rule works on both sides of the boundary." },
  { id: "debug-2", kind: "debug", title: "Off-by-one", prompt: "Fix the loop so all five array elements are processed.", code: "DECLARE Data : ARRAY[1:5] OF INTEGER\nFOR Index ← 1 TO 4\n    INPUT Data[Index]\nNEXT Index\nOUTPUT Data[5]", input: "1\n2\n3\n4\n5", expected: "5", hiddenTests: [{ input: "9\n8\n7\n6\n5", expected: "5" }, { input: "1\n1\n1\n1\n12", expected: "12" }], explanation: "The loop must run from 1 TO 5, otherwise Data[5] is never input. The hidden cases make sure the final element is genuinely processed." },
  { id: "debug-3", kind: "debug", title: "Search boundary", prompt: "Fix the linear search so it checks every element and outputs the first matching index, or -1 if absent.", code: "DECLARE Data : ARRAY[1:5] OF INTEGER\nDECLARE Target : INTEGER\nDECLARE Found : INTEGER\nFound ← -1\nINPUT Data[1]\nINPUT Data[2]\nINPUT Data[3]\nINPUT Data[4]\nINPUT Data[5]\nINPUT Target\nFOR Index ← 1 TO 4\n    IF Data[Index] = Target THEN\n        Found ← Index\n    ENDIF\nNEXT Index\nOUTPUT Found", input: "4\n8\n2\n9\n7\n7", expected: "5", hiddenTests: [{ input: "7\n8\n2\n9\n4\n7", expected: "1" }, { input: "4\n8\n2\n9\n7\n6", expected: "-1" }], explanation: "The loop must include the fifth element. A correct search also needs to preserve the first matching index rather than replacing it with a later match." },
  { id: "debug-4", kind: "debug", title: "Loop termination", prompt: "Fix the algorithm so it counts positive values in all five inputs.", code: "DECLARE Count : INTEGER\nDECLARE Value : INTEGER\nCount ← 0\nFOR Index ← 1 TO 4\n    INPUT Value\n    IF Value > 0 THEN\n        Count ← Count + 1\n    ENDIF\nNEXT Index\nOUTPUT Count", input: "3\n-1\n4\n0\n2", expected: "3", hiddenTests: [{ input: "-4\n-2\n0\n5\n7", expected: "2" }, { input: "1\n2\n3\n4\n5", expected: "5" }], explanation: "The loop currently consumes only four inputs. It must process all five values." },
  { id: "debug-5", kind: "debug", title: "Binary-search update", prompt: "Fix the binary search so it finds a target at either end of the sorted array.", code: "DECLARE Data : ARRAY[1:5] OF INTEGER\nDECLARE Target : INTEGER\nDECLARE Low : INTEGER\nDECLARE High : INTEGER\nDECLARE Mid : INTEGER\nDECLARE Found : INTEGER\nFOR Index ← 1 TO 5\n    INPUT Data[Index]\nNEXT Index\nINPUT Target\nLow ← 1\nHigh ← 5\nFound ← -1\nWHILE Low < High\n    Mid ← (Low + High) DIV 2\n    IF Data[Mid] = Target THEN\n        Found ← Mid\n    ELSE\n        IF Data[Mid] < Target THEN\n            Low ← Mid + 1\n        ELSE\n            High ← Mid - 1\n        ENDIF\n    ENDIF\nENDWHILE\nOUTPUT Found", input: "2\n5\n9\n14\n20\n20", expected: "5", hiddenTests: [{ input: "2\n5\n9\n14\n20\n2", expected: "1" }, { input: "2\n5\n9\n14\n20\n14", expected: "4" }], explanation: "The search must keep a valid inclusive range and terminate when Low passes High. The original condition can skip a final candidate." },
  { id: "choice-1", kind: "choice", title: "Search choice", prompt: "Which algorithm requires the data to be sorted before searching?", options: ["Linear search", "Binary search", "Bubble sort", "Insertion sort"], answer: "Binary search", explanation: "Binary search relies on ordering so it can discard half of the remaining search range after each comparison." },
  { id: "choice-2", kind: "choice", title: "Loop choice", prompt: "Which loop is most directly suited to repeating exactly 20 times?", options: ["IF", "CASE", "FOR", "REPEAT UNTIL"], answer: "FOR", explanation: "A count-controlled FOR loop directly expresses a known number of iterations." },
  { id: "choice-3", kind: "choice", title: "Complexity", prompt: "A single loop runs once for every item in an input array. What is the usual time complexity?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: "O(n)", explanation: "The work grows proportionally with the number of input items." },
  { id: "choice-4", kind: "choice", title: "Test-data choice", prompt: "Which input is most useful for testing a condition IF Mark >= 50?", options: ["50", "75", "25", "49 and 50"], answer: "49 and 50", explanation: "The strongest boundary test checks values immediately below and at the boundary." },
];

function normalise(value: string) {
  return value.trim().replace(/\r\n/g, "\n");
}

async function runPseudocode(code: string, input: string, id: string) {
  const result = await executeCode({
    id,
    language: "pseudocode",
    code,
    entryFile: "main.pseudo",
    inputs: input.split(/\r?\n/).filter(Boolean),
    timeoutMs: 5000,
  });
  return {
    ok: result.exitCode === 0,
    actual: normalise(result.events.filter(event => event.type === "stdout").map(event => event.text).join("\n")),
  };
}

export default function AlgorithmAssessmentPanel() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [testReport, setTestReport] = useState<{ label: string; passed: boolean; actual?: string }[]>([]);
  const assessmentStorageKey = "shadecode.comp-lab.algorithm-assessment.v1";
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(assessmentStorageKey) || "null") as { index?: number; completed?: string[] } | null;
      if (!saved) return;
      const restored = Array.isArray(saved.completed) ? saved.completed.filter(id => QUESTIONS.some(question => question.id === id)) : [];
      setCompleted(restored);
      setScore(restored.length);
      if (typeof saved.index === "number" && saved.index >= 0 && saved.index < QUESTIONS.length) setIndex(saved.index);
    } catch {
      // Ignore malformed local assessment state and start a clean session.
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(assessmentStorageKey, JSON.stringify({ index, completed }));
    } catch {
      // Persistence is best-effort and must never block assessment use.
    }
  }, [index, completed]);


  const question = QUESTIONS[index];
  const progress = useMemo(() => Math.round((completed.length / QUESTIONS.length) * 100), [completed.length]);

  const submit = async () => {
    if (!answer.trim() || busy) return;
    setBusy(true);
    setFeedback(null);
    setTestReport([]);
    let correct = false;

    if (question.kind === "choice" || question.kind === "trace") {
      correct = normalise(answer) === normalise(question.kind === "choice" ? question.answer : question.expected);
      setTestReport([{ label: "Answer check", passed: correct, actual: answer.trim() }]);
    } else {
      const visible = await runPseudocode(answer, question.input, "algorithm-assessment-visible-" + question.id);
      const report: { label: string; passed: boolean; actual?: string }[] = [
        { label: "Visible test", passed: visible.ok && visible.actual === normalise(question.expected), actual: visible.actual || "No output" },
      ];

      for (let testIndex = 0; testIndex < question.hiddenTests.length; testIndex += 1) {
        const test = question.hiddenTests[testIndex];
        try {
          const result = await runPseudocode(answer, test.input, "algorithm-assessment-hidden-" + question.id + "-" + testIndex);
          report.push({ label: "Hidden test " + (testIndex + 1), passed: result.ok && result.actual === normalise(test.expected), actual: result.actual || "No output" });
        } catch {
          report.push({ label: "Hidden test " + (testIndex + 1), passed: false, actual: "Runtime error" });
        }
      }

      setTestReport(report);
      correct = report.every(item => item.passed);
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
    setTestReport([]);
  };

  const reset = () => {
    try { localStorage.removeItem(assessmentStorageKey); } catch { /* best-effort cleanup */ }
    setIndex(0);
    setAnswer("");
    setFeedback(null);
    setBusy(false);
    setScore(0);
    setCompleted([]);
    setTestReport([]);
  };

  const failedHidden = testReport.filter(item => item.label.startsWith("Hidden") && !item.passed).length;
  const passedTests = testReport.filter(item => item.passed).length;

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

        {testReport.length > 0 && (
          <div className="mt-4 rounded-xl border border-[var(--card-border)] bg-[var(--surface)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Submission checks</div>
              <div className="text-[10px] text-[var(--muted-foreground)]">{passedTests}/{testReport.length} passed</div>
            </div>
            <div className="mt-2 space-y-1.5">
              {testReport.map(test => (
                <div key={test.label} className="flex items-center gap-2 rounded-lg border border-[var(--card-border)] px-2.5 py-2 text-[10px]">
                  {test.passed ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <X className="h-3.5 w-3.5 text-red-400" />}
                  <span className="flex-1 text-[var(--foreground)]">{test.label}</span>
                  {test.actual && <span className="font-mono text-[var(--muted-foreground)]">{test.actual}</span>}
                </div>
              ))}
            </div>
            {failedHidden > 0 && <p className="mt-2 text-[10px] leading-4 text-amber-300">A hidden edge case failed. Re-check boundaries, loop limits, and termination rather than fitting the visible example.</p>}
          </div>
        )}

        {feedback && (
          <div className={`mt-4 rounded-xl border p-3 text-xs ${feedback === "correct" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300" : "border-red-500/20 bg-red-500/5 text-red-300"}`}>
            <div className="flex items-center gap-2 font-semibold">{feedback === "correct" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}{feedback === "correct" ? "Correct" : "Not yet"}</div>
            <p className="mt-1 leading-5">{question.explanation}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={submit} disabled={!answer.trim() || busy} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-[10px] font-semibold text-white disabled:opacity-50"><Zap className="h-3.5 w-3.5" />{busy ? "Checking..." : "Submit solution"}</button>
          <button type="button" onClick={next} className="inline-flex items-center gap-2 rounded-xl border border-[var(--card-border)] px-4 py-2 text-[10px] font-semibold text-[var(--foreground)]">Next <ChevronRight className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-transparent px-4 py-2 text-[10px] text-[var(--muted-foreground)] hover:bg-[var(--surface-2)]"><RotateCcw className="h-3.5 w-3.5" />Reset</button>
        </div>
      </div>
    </section>
  );
}
