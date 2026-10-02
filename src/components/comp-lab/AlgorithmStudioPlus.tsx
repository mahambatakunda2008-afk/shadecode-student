"use client";

import { type ChangeEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, BookOpen, Check, Download, FileImage, GitBranch, Lightbulb, Play, Plus, Save, Target, TestTube2, Trash2, Upload, Workflow, X, Zap } from "lucide-react";
import AlgorithmAssessmentPanel from "./AlgorithmAssessmentPanel";
import LogicCircuitsPanel from "./LogicCircuitsPanel";
import BooleanLogicLab from "./BooleanLogicLab";
import { executeCode } from "@/lib/code-lab/runtime";

type Kind = "start" | "end" | "process" | "input" | "output" | "decision";
type Node = { id: string; kind: Kind; text: string; x: number; y: number; line: number };
type Edge = { id: string; from: string; to: string; label?: string };
type Test = { id: string; input: string; expected: string };
type Project = { version: 4; code: string; nodes: Node[]; edges: Edge[]; tests: Test[] };
type Tab = "learn" | "practice" | "write" | "flow" | "trace" | "tests" | "analyse" | "assess" | "logic";
type Lesson = { id: string; title: string; level: "AS" | "A Level"; summary: string; rule: string; example: string; examTip: string };
type Challenge = { id: string; title: string; level: "AS" | "A Level"; skill: string; prompt: string; hint: string; starter: string; tests: Test[] };

const lessons: Lesson[] = [
  { id: "declarations", title: "Variables, constants & assignment", level: "AS", summary: "Declare data explicitly, then change variable values with the assignment operator.", rule: "DECLARE name : TYPE\nCONSTANT Name = literal\nname ← expression", example: "DECLARE Total : INTEGER\nCONSTANT PassMark = 50\nTotal ← 0", examTip: "Use Cambridge keywords in upper-case. Identifiers are mixed case and the assignment arrow is ←." },
  { id: "selection", title: "IF, ELSE & nested decisions", level: "AS", summary: "Choose a path by evaluating a Boolean condition.", rule: "IF condition THEN\n   ...\nELSE\n   ...\nEND IF", example: "IF Mark >= 50 THEN\n    OUTPUT \"Pass\"\nELSE\n    OUTPUT \"Fail\"\nEND IF", examTip: "Indent statements belonging to the branch. Nested IF statements are allowed." },
  { id: "case", title: "CASE selection", level: "AS", summary: "Use CASE when one expression is compared against several known alternatives.", rule: "CASE OF Choice\n   value : statement\n   OTHERWISE : statement\nENDCASE", example: "CASE OF Grade\n    \"A\" : OUTPUT \"Excellent\"\n    \"B\" : OUTPUT \"Good\"\n    OTHERWISE : OUTPUT \"Keep working\"\nENDCASE", examTip: "CASE is useful when several branches depend on the same value." },
  { id: "loops", title: "Choosing the right loop", level: "AS", summary: "Count-controlled, pre-condition and post-condition loops solve different problems.", rule: "FOR ... TO ...\nWHILE condition\n   ...\nENDWHILE\nREPEAT\n   ...\nUNTIL condition", example: "FOR Count ← 1 TO 10\n    OUTPUT Count\nNEXT Count", examTip: "Be able to justify why one loop structure is more suitable than another." },
  { id: "arrays", title: "One- and two-dimensional arrays", level: "AS", summary: "Arrays store fixed-length collections of the same data type and are accessed by index.", rule: "DECLARE Scores : ARRAY[1:30] OF INTEGER", example: "DECLARE Scores : ARRAY[1:5] OF INTEGER\nFOR Index ← 1 TO 5\n    INPUT Scores[Index]\nNEXT Index", examTip: "Watch the declared lower and upper bounds. Off-by-one errors are classic exam traps." },
  { id: "procedures", title: "Procedures, functions & parameters", level: "AS", summary: "Break a solution into reusable modules and pass information through parameters.", rule: "PROCEDURE Name(...)\n   ...\nENDPROCEDURE", example: "PROCEDURE ShowDouble(Value : INTEGER)\n    OUTPUT Value * 2\nENDPROCEDURE", examTip: "Know the difference between a procedure, which performs an action, and a function, which returns a value." },
  { id: "search", title: "Linear & binary search", level: "AS", summary: "Search algorithms trade simplicity for speed and depend on properties of the data.", rule: "Linear search checks items in sequence.\nBinary search repeatedly halves a sorted search space.", example: "Linear: O(n) worst case\nBinary: O(log n) worst case", examTip: "Binary search requires sorted data. State that requirement when explaining the algorithm." },
  { id: "sort", title: "Sorting & algorithm choice", level: "AS", summary: "Sorting rearranges data according to a chosen ordering and algorithm.", rule: "Bubble sort repeatedly compares adjacent items and swaps them when out of order.", example: "FOR Pass ← 1 TO N - 1\n    FOR Index ← 1 TO N - Pass\n        IF Data[Index] > Data[Index + 1] THEN\n            // swap\n        END IF\n    NEXT Index\nNEXT Pass", examTip: "Trace the array after each important pass or swap. Do not jump straight to the final answer." },
  { id: "recursion", title: "Recursion", level: "A Level", summary: "A recursive solution calls itself on a smaller problem and must have a base case.", rule: "Base case + recursive case + progress toward the base case.", example: "FUNCTION Factorial(N : INTEGER) RETURNS INTEGER\n    IF N = 0 THEN\n        RETURN 1\n    ELSE\n        RETURN N * Factorial(N - 1)\n    END IF\nENDFUNCTION", examTip: "Every recursive call must move toward the base case." },
  { id: "complexity", title: "Time & space complexity", level: "A Level", summary: "Estimate how resource use grows as the input size increases.", rule: "One pass → O(n)\nNested loops → often O(n²)\nHalving search space → O(log n)", example: "FOR i ← 1 TO N\n    OUTPUT i\nNEXT i\n→ O(n)", examTip: "Explain the dominant operation and how often it can execute. Do not just state a Big-O label." },
  { id: "thinking", title: "Computational thinking", level: "AS", summary: "Turn a real problem into a manageable algorithm using decomposition, abstraction and pattern recognition.", rule: "Decompose → identify data → abstract the problem → design steps → test.", example: "Problem: process 100 marks\nDecompose: input → validate → process → output\nAbstract: each mark can be handled by the same rule.", examTip: "Before writing pseudocode, identify inputs, outputs, processing and any assumptions." },
  { id: "testing", title: "Dry runs & test data", level: "AS", summary: "Use traces and deliberate test data to expose syntax, logic and run-time faults.", rule: "Normal + abnormal + boundary/extreme data.", example: "Pass mark = 50\nNormal: 72\nBoundary: 50\nBoundary: 49\nAbnormal: -5", examTip: "A good test case is chosen because it probes a particular behaviour, not because it looks random." },
  { id: "flow-design", title: "From flowchart to pseudocode", level: "AS", summary: "Translate a design into structured pseudocode while preserving the control flow.", rule: "Input/output → statements\nProcess → assignments\nDecision → IF/CASE\nLoop → FOR/WHILE/REPEAT", example: "Flowchart decision: Mark >= 50?\n→ IF Mark >= 50 THEN ... ELSE ... ENDIF", examTip: "The pseudocode should implement the design, not invent a different algorithm halfway through." },
  { id: "adt", title: "ADT thinking", level: "AS", summary: "Choose data structures by the operations the problem needs, not just by habit.", rule: "Stack → LIFO\nQueue → FIFO\nLinked list → linked nodes\nTree → hierarchical search", example: "Undo operations → stack\nPrinter jobs → queue\nHierarchical data → tree", examTip: "Justify the structure using the operations and access pattern required by the problem." },
  { id: "insertion-sort", title: "Insertion sort", level: "A Level", summary: "Build a sorted section by inserting each new item into its correct position.", rule: "Take next item → shift larger items → insert the item.", example: "Sorted: [2, 5, 8]\nNext: 6\nShift 8 → insert 6 → [2, 5, 6, 8]", examTip: "Be ready to trace the array after each insertion and compare performance with bubble sort." },
];

const challenges: Challenge[] = [
  { id: "grade", title: "Grade a mark", level: "AS", skill: "Selection", prompt: "INPUT a mark. Output Pass when the mark is at least 50, otherwise output Fail.", hint: "Use INPUT Mark, then IF Mark >= 50 THEN.", starter: "DECLARE Mark : INTEGER\nINPUT Mark\n// write your IF statement here", tests: [{ id: "t1", input: "72", expected: "Pass" }, { id: "t2", input: "49", expected: "Fail" }, { id: "t3", input: "50", expected: "Pass" }] },
  { id: "largest", title: "Find the largest of three", level: "AS", skill: "Selection + variables", prompt: "INPUT three integers and OUTPUT the largest value.", hint: "Keep a Largest variable and compare each new value against it.", starter: "DECLARE A : INTEGER\nDECLARE B : INTEGER\nDECLARE C : INTEGER\nDECLARE Largest : INTEGER\nINPUT A\nINPUT B\nINPUT C\n// complete the algorithm", tests: [{ id: "t1", input: "4\n9\n2", expected: "9" }, { id: "t2", input: "12\n3\n12", expected: "12" }] },
  { id: "count-positive", title: "Count positive values", level: "AS", skill: "Iteration + selection", prompt: "INPUT 5 integers and OUTPUT how many are greater than zero.", hint: "Initialise Count to zero. Repeat five times and increment it when the input is positive.", starter: "DECLARE Count : INTEGER\nDECLARE Number : INTEGER\nCount ← 0\nFOR Index ← 1 TO 5\n    INPUT Number\n    // decide whether to increment Count\nNEXT Index\nOUTPUT Count", tests: [{ id: "t1", input: "2\n-1\n5\n0\n7", expected: "3" }, { id: "t2", input: "-2\n-1\n0\n0\n-7", expected: "0" }] },
  { id: "linear-search", title: "Linear search", level: "AS", skill: "Arrays + searching", prompt: "Search a five-item integer array for a target and OUTPUT the index if found, otherwise OUTPUT -1.", hint: "Start at the lower bound and stop when you find the target. Keep a position or found flag.", starter: "DECLARE Data : ARRAY[1:5] OF INTEGER\nDECLARE Target : INTEGER\nDECLARE Position : INTEGER\nDECLARE Found : BOOLEAN\nFound ← FALSE\nPosition ← -1\n// INPUT the five values, then Target\n// write the search\nOUTPUT Position", tests: [{ id: "t1", input: "3\n8\n2\n9\n4\n9", expected: "4" }, { id: "t2", input: "3\n8\n2\n9\n4\n7", expected: "-1" }] },
  { id: "binary-search", title: "Binary search", level: "A Level", skill: "Searching + efficiency", prompt: "Write a binary search for a sorted five-item array. OUTPUT the index when found, otherwise -1.", hint: "Maintain Lower and Upper bounds. Recalculate Mid and discard half the search space after each comparison.", starter: "DECLARE Data : ARRAY[1:5] OF INTEGER\nDECLARE Target : INTEGER\nDECLARE Lower : INTEGER\nDECLARE Upper : INTEGER\nDECLARE Mid : INTEGER\nDECLARE Position : INTEGER\nLower ← 1\nUpper ← 5\nPosition ← -1\n// INPUT sorted values, then Target\n// write the search\nOUTPUT Position", tests: [{ id: "t1", input: "2\n5\n9\n14\n20\n14", expected: "4" }, { id: "t2", input: "2\n5\n9\n14\n20\n7", expected: "-1" }] },
  { id: "bubble-sort", title: "Bubble sort", level: "A Level", skill: "Sorting + arrays", prompt: "Sort five integers into ascending order using bubble sort and output the result.", hint: "Use nested loops. Compare adjacent elements and swap when the left value is larger.", starter: "DECLARE Data : ARRAY[1:5] OF INTEGER\nDECLARE Temp : INTEGER\n// INPUT five values\n// write the bubble sort\n// OUTPUT the sorted array", tests: [{ id: "t1", input: "5\n2\n9\n1\n4", expected: "1\n2\n4\n5\n9" }, { id: "t2", input: "1\n1\n1\n1\n1", expected: "1\n1\n1\n1\n1" }] },
];

const starter = `// Build your algorithm here\nDECLARE Number : INTEGER\nINPUT Number\nIF Number MOD 2 = 0 THEN\n    OUTPUT "Even"\nELSE\n    OUTPUT "Odd"\nENDIF`;
const kinds: Kind[] = ["start", "end", "process", "input", "output", "decision"];
const labels: Record<Kind, string> = { start: "START", end: "END", process: "PROCESS", input: "INPUT", output: "OUTPUT", decision: "DECISION" };
const colors: Record<Kind, string> = { start: "#22c55e", end: "#ef4444", process: "#60a5fa", input: "#a78bfa", output: "#a78bfa", decision: "#f59e0b" };
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

function cleanLines(code: string) { return code.split(/\r?\n/).map((raw, index) => ({ raw, text: raw.replace(/\/\/.*$/, "").trim(), line: index + 1 })).filter(x => x.text).slice(0, 80); }
function inferKind(text: string, index: number, total: number): Kind { const s = text.toUpperCase(); if (index === 0) return "start"; if (index === total - 1 || /^(END|RETURN)\b/.test(s)) return "end"; if (/^(IF|WHILE|FOR|REPEAT|CASE)\b/.test(s)) return "decision"; if (/^INPUT\b/.test(s)) return "input"; if (/^(OUTPUT|PRINT)\b/.test(s)) return "output"; return "process"; }
function buildNodes(code: string): Node[] { const lines = cleanLines(code); if (!lines.length) return [{ id: uid("node"), kind: "start", text: "START", x: 380, y: 60, line: 1 }, { id: uid("node"), kind: "end", text: "END", x: 380, y: 180, line: 2 }]; return lines.map((x, i) => ({ id: uid("node"), kind: inferKind(x.text, i, lines.length), text: x.text, x: 380, y: 55 + i * 82, line: x.line })); }
function buildEdges(code: string, nodes: Node[]): Edge[] {
  const lines = cleanLines(code);
  const edges: Edge[] = [];
  const add = (from: Node | undefined, to: Node | undefined, label?: string) => {
    if (!from || !to) return;
    if (!edges.some(edge => edge.from === from.id && edge.to === to.id && edge.label === label)) {
      edges.push({ id: uid("edge"), from: from.id, to: to.id, label });
    }
  };

  const ifStack: number[] = [];
  const elseForIf = new Map<number, number>();
  const endForIf = new Map<number, number>();
  const ifForElse = new Map<number, number>();
  const ifForEnd = new Map<number, number>();
  const loopStack: Array<{ kind: "FOR" | "WHILE" | "REPEAT"; start: number }> = [];
  const loopStartForEnd = new Map<number, number>();

  lines.forEach((line, index) => {
    const text = line.text.toUpperCase();
    if (/^IF\b/.test(text)) {
      ifStack.push(index);
    } else if (/^ELSE$/.test(text)) {
      const start = ifStack[ifStack.length - 1];
      if (start !== undefined) {
        elseForIf.set(start, index);
        ifForElse.set(index, start);
      }
    } else if (/^END ?IF\b/.test(text)) {
      const start = ifStack.pop();
      if (start !== undefined) {
        endForIf.set(start, index);
        ifForEnd.set(index, start);
      }
    }

    if (/^FOR\b/.test(text)) loopStack.push({ kind: "FOR", start: index });
    else if (/^WHILE\b/.test(text)) loopStack.push({ kind: "WHILE", start: index });
    else if (/^REPEAT\b/.test(text)) loopStack.push({ kind: "REPEAT", start: index });
    else if (/^NEXT\b|^ENDWHILE\b|^UNTIL\b/.test(text)) {
      const loop = loopStack.pop();
      if (loop) loopStartForEnd.set(index, loop.start);
    }
  });

  const isControlMarker = (text: string) =>
    /^(ELSE|END ?IF\b|ENDCASE\b|NEXT\b|ENDWHILE\b|UNTIL\b)/.test(text);

  const nextReal = (index: number) => {
    const next = index + 1;
    return next < nodes.length ? next : undefined;
  };

  for (let i = 0; i < nodes.length; i++) {
    const current = lines[i]?.text.toUpperCase() ?? "";
    const nextIndex = nextReal(i);

    if (/^IF\b/.test(current)) {
      const elseIndex = elseForIf.get(i);
      const endIndex = endForIf.get(i);
      const trueTarget = nextIndex !== undefined && elseIndex === undefined ? nextIndex : elseIndex !== undefined ? elseIndex + 1 : endIndex !== undefined ? endIndex + 1 : nextIndex;
      const falseTarget = elseIndex !== undefined ? elseIndex + 1 : endIndex !== undefined ? endIndex + 1 : nextIndex;
      if (trueTarget !== undefined && !isControlMarker(lines[trueTarget]?.text.toUpperCase() ?? "")) add(nodes[i], nodes[trueTarget], "TRUE");
      if (falseTarget !== undefined && falseTarget < nodes.length) add(nodes[i], nodes[falseTarget], "FALSE");
      continue;
    }

    if (/^ELSE$/.test(current)) {
      const start = ifForElse.get(i);
      const endIndex = start === undefined ? undefined : endForIf.get(start);
      if (endIndex !== undefined) add(nodes[i], nodes[endIndex + 1]);
      continue;
    }

    if (/^END ?IF\b/.test(current)) {
      if (nextIndex !== undefined) add(nodes[i], nodes[nextIndex]);
      continue;
    }

    if (/^CASE\b/.test(current)) {
      let depth = 0;
      for (let j = i + 1; j < lines.length; j++) {
        const text = lines[j].text.toUpperCase();
        if (/^CASE\b/.test(text)) depth++;
        if (/^ENDCASE\b/.test(text)) {
          if (depth === 0) break;
          depth--;
          continue;
        }
        if (depth > 0) continue;
        const match = lines[j].text.match(/^(.+?)\s*:\s*(.+)$/);
        if (match) add(nodes[i], nodes[j], match[1].trim());
      }
      continue;
    }

    if (/^ENDCASE\b/.test(current)) {
      if (nextIndex !== undefined) add(nodes[i], nodes[nextIndex]);
      continue;
    }

    if (/^FOR\b|^WHILE\b|^REPEAT\b/.test(current)) {
      if (nextIndex !== undefined && !isControlMarker(lines[nextIndex]?.text.toUpperCase() ?? "")) {
        add(nodes[i], nodes[nextIndex], /^WHILE\b/.test(current) ? "TRUE" : "BODY");
      }
      continue;
    }

    if (/^NEXT\b|^ENDWHILE\b|^UNTIL\b/.test(current)) {
      const loopStart = loopStartForEnd.get(i);
      if (loopStart !== undefined) add(nodes[i], nodes[loopStart], "LOOP");
      if (nextIndex !== undefined) add(nodes[i], nodes[nextIndex], /^UNTIL\b/.test(current) ? "FALSE" : undefined);
      continue;
    }

    if (/^END\b/.test(current)) continue;
    if (nextIndex !== undefined && !isControlMarker(lines[nextIndex]?.text.toUpperCase() ?? "")) add(nodes[i], nodes[nextIndex]);
  }

  return edges;
}

function shape(kind: Kind) { if (kind === "decision") return "M 0 -36 L 108 0 L 0 36 L -108 0 Z"; if (kind === "input" || kind === "output") return "M -100 -28 L 100 -28 L 78 28 L -122 28 Z"; if (kind === "start" || kind === "end") return "M -92 0 A 92 28 0 1 0 92 0 A 92 28 0 1 0 -92 0"; return "M -96 -30 Q -96 -38 -86 -38 L 86 -38 Q 96 -38 96 -30 L 96 30 Q 96 38 86 38 L -86 38 Q -96 38 -96 30 Z"; }
function shortText(text: string) { return text.length > 26 ? `${text.slice(0, 25)}…` : text; }
const initialAlgorithmNodes = buildNodes(starter);

export default function AlgorithmStudioPlus() {
  const [code, setCode] = useState(starter);
  const [nodes, setNodes] = useState<Node[]>(initialAlgorithmNodes);
  const [edges, setEdges] = useState<Edge[]>(() => buildEdges(starter, initialAlgorithmNodes));
  const [tests, setTests] = useState<Test[]>([{ id: uid("test"), input: "8", expected: "Even" }, { id: uid("test"), input: "7", expected: "Odd" }]);
  const [inputs, setInputs] = useState("8");
  const [output, setOutput] = useState("");
  const [traceText, setTraceText] = useState("");
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<Array<{ id: string; passed: boolean; input: string; expected: string; actual: string; error?: string }>>([]);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<Tab>("learn");
  const [lessonId, setLessonId] = useState(lessons[0].id);
  const [challengeId, setChallengeId] = useState(challenges[0].id);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const lesson = lessons.find(item => item.id === lessonId) ?? lessons[0];
  const challenge = challenges.find(item => item.id === challengeId) ?? challenges[0];
  const complexity = useMemo(() => {
    const lines = cleanLines(code).map(x => x.text.toUpperCase());
    const loops = lines.filter(x => /^(FOR|WHILE|REPEAT)\b/.test(x)).length;
    if (/\bMID\b|LOWER|UPPER/.test(lines.join(" "))) return { time: "O(log n) candidate", reason: "The code contains signals commonly associated with repeatedly reducing a search range." };
    if (loops >= 2) return { time: "O(n²) candidate", reason: "Multiple loop levels are visible. Confirm whether the loops actually depend on the same input size." };
    if (loops === 1) return { time: "O(n) candidate", reason: "One dominant loop is visible." };
    return { time: "O(1) candidate", reason: "No dominant loop is visible in the current editor. Check whether called procedures change this." };
  }, [code]);

  useEffect(() => { try { const raw = localStorage.getItem("shadecode.comp-lab.algorithm-studio"); if (!raw) return; const project = JSON.parse(raw) as Partial<Project>; if (project.code) setCode(project.code); if (Array.isArray(project.nodes)) setNodes(project.nodes); if (Array.isArray(project.edges)) setEdges(project.edges); if (Array.isArray(project.tests)) setTests(project.tests); } catch { /* ignore invalid local draft */ } }, []);

  const trace = useMemo(() => { const marker = traceText.indexOf("TRACE TABLE"); if (marker < 0) return []; const rows = traceText.slice(marker).split(/\r?\n/).filter(row => row.trim().startsWith("|")); if (rows.length < 3) return []; const headers = rows[0].split("|").map(x => x.trim()).filter(Boolean); return rows.slice(2).map(row => row.split("|").map(x => x.trim()).filter(Boolean)).map(cells => headers.map((header, index) => [header, cells[index] ?? ""] as const)); }, [traceText]);

  const save = () => { const project: Project = { version: 4, code, nodes, edges, tests }; localStorage.setItem("shadecode.comp-lab.algorithm-studio", JSON.stringify(project)); setSaved(true); window.setTimeout(() => setSaved(false), 1400); };
  const regenerate = () => { const nextNodes = buildNodes(code); setNodes(nextNodes); setEdges(buildEdges(code, nextNodes)); setTab("flow"); };
  const run = async () => {
    setRunning(true);
    setDiagnostics([]);
    setOutput("");
    setTraceText("");
    try {
      const result = await executeCode({
        id: uid("run"),
        language: "pseudocode",
        code,
        entryFile: "main.pseudo",
        inputs: inputs.split(/\r?\n/).filter(Boolean),
        timeoutMs: 5000,
      });
      const stdout = result.events.filter(event => event.type === "stdout").map(event => event.text).join("\n").trim();
      const trace = result.events.filter(event => event.type === "trace").map(event => event.text).join("\n");
      setOutput(stdout || (result.exitCode === 0 ? "Algorithm completed with no output." : "Algorithm failed."));
      setTraceText(trace);
      setDiagnostics(result.diagnostics.map(diagnostic => `Line ${diagnostic.line ?? "?"}: ${diagnostic.message}`));
      setTab(result.diagnostics.length ? "write" : "trace");
    } catch (error) {
      setDiagnostics([error instanceof Error ? error.message : "The pseudocode runtime could not execute this algorithm."]);
      setTab("write");
    } finally {
      setRunning(false);
    }
  };
  const runTests = async () => {
    setRunning(true);
    setDiagnostics([]);
    setTraceText("");
    setTestResults([]);
    try {
      const results: Array<{ id: string; passed: boolean; input: string; expected: string; actual: string; error?: string }> = [];
      for (const test of tests) {
        try {
          const result = await executeCode({
            id: uid("test-run"),
            language: "pseudocode",
            code,
            entryFile: "main.pseudo",
            inputs: test.input.split(/\r?\n/),
            timeoutMs: 5000,
          });
          const actual = result.events.filter(event => event.type === "stdout").map(event => event.text).join("\n").trim();
          const error = result.diagnostics.map(diagnostic => diagnostic.message).join("; ") || undefined;
          results.push({ id: test.id, passed: result.exitCode === 0 && actual === test.expected.trim(), input: test.input, expected: test.expected.trim(), actual, error });
        } catch (error) {
          results.push({ id: test.id, passed: false, input: test.input, expected: test.expected.trim(), actual: "", error: error instanceof Error ? error.message : "Runtime error" });
        }
      }
      setTestResults(results);
      setOutput(results.map(item => `${item.passed ? "PASS" : "FAIL"} | expected: ${item.expected} | actual: ${item.actual}`).join("\n"));
      setTab("tests");
    } finally {
      setRunning(false);
    }
  };
  const startDrag = (event: ReactPointerEvent<SVGGElement>, node: Node) => { const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return; const x = ((event.clientX - rect.left) / rect.width) * 760; const y = ((event.clientY - rect.top) / rect.height) * 620; setDrag({ id: node.id, dx: node.x - x, dy: node.y - y }); setSelected(node.id); event.currentTarget.setPointerCapture(event.pointerId); };
  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => { if (!drag) return; const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return; const x = Math.max(115, Math.min(645, ((event.clientX - rect.left) / rect.width) * 760 + drag.dx)); const y = Math.max(45, Math.min(590, ((event.clientY - rect.top) / rect.height) * 620 + drag.dy)); setNodes(current => current.map(node => node.id === drag.id ? { ...node, x, y } : node)); };
  const addNode = (kind: Kind) => { const node: Node = { id: uid("node"), kind, text: labels[kind], x: 380, y: Math.min(570, 70 + nodes.length * 80), line: nodes.length + 1 }; setNodes(current => [...current, node]); setSelected(node.id); };
  const editNode = (id: string, text: string) => setNodes(current => current.map(node => node.id === id ? { ...node, text } : node));
  const removeNode = () => { if (!selected) return; setNodes(current => current.filter(node => node.id !== selected)); setEdges(current => current.filter(edge => edge.from !== selected && edge.to !== selected)); setSelected(null); };
  const exportProject = () => { const blob = new Blob([JSON.stringify({ version: 4, code, nodes, edges, tests }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "algorithm-project.json"; link.click(); URL.revokeObjectURL(url); };
  const exportFlowchartImage = async (format: "svg" | "png") => {
    const svg = svgRef.current;
    if (!svg) { setDiagnostics(["Open the Flowchart tab before exporting the diagram."]); return; }
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "1520");
    clone.setAttribute("height", "1240");
    clone.style.background = "#070a10";
    const serialized = new XMLSerializer().serializeToString(clone);
    if (format === "svg") {
      const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "algorithm-flowchart.svg";
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1520;
      canvas.height = 1240;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#070a10";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "algorithm-flowchart.png";
        link.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(serialized);
  };
  const exportStudySheet = async (format: "svg" | "png") => {
    const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const codeLines = code.split(/\r?\n/);
    const lineHeight = 18;
    const codeHeight = Math.max(120, Math.min(620, codeLines.length * lineHeight + 40));
    const sheetWidth = 1120;
    const sheetHeight = 1480;
    const flow = svgRef.current;
    const flowMarkup = flow ? new XMLSerializer().serializeToString(flow.cloneNode(true) as SVGSVGElement) : "";
    const flowInner = flowMarkup.match(/<svg[^>]*>([\s\S]*)<\/svg>/i)?.[1] ?? "";
    const codeMarkup = codeLines.map((line, index) => `<text x="70" y="${250 + index * lineHeight}" font-family="ui-monospace, SFMono-Regular, Consolas, monospace" font-size="12" fill="#334155">${String(index + 1).padStart(2, "0")}  ${escapeXml(line)}</text>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${sheetHeight}" viewBox="0 0 ${sheetWidth} ${sheetHeight}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="70" y="68" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#0f172a">Algorithm Study Sheet</text>
      <text x="70" y="98" font-family="Arial, sans-serif" font-size="13" fill="#64748b">Shadecode Student · Cambridge 9618 practice workspace</text>
      <rect x="70" y="122" width="980" height="82" rx="14" fill="#f8fafc" stroke="#e2e8f0"/>
      <text x="92" y="151" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#0f172a">${escapeXml(lesson.title)}</text>
      <text x="92" y="176" font-family="Arial, sans-serif" font-size="12" fill="#475569">${escapeXml(lesson.level)} · ${escapeXml(complexity.time)} · Algorithms</text>
      <rect x="70" y="224" width="980" height="${codeHeight}" rx="14" fill="#f8fafc" stroke="#e2e8f0"/>
      <text x="92" y="250" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a">Pseudocode</text>
      ${codeMarkup}
      <text x="70" y="${codeHeight + 285}" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#0f172a">Flowchart</text>
      <rect x="70" y="${codeHeight + 305}" width="980" height="650" rx="14" fill="#ffffff" stroke="#e2e8f0"/>
      <g transform="translate(180 ${codeHeight + 320}) scale(1.0)">
        ${flowInner}
      </g>
      <text x="70" y="1405" font-family="Arial, sans-serif" font-size="11" fill="#64748b">Study workflow: understand → write → execute → test → trace → analyse.</text>
      <text x="1050" y="1405" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#64748b">Generated locally</text>
    </svg>`;
    if (format === "svg") {
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = "algorithm-study-sheet.svg"; link.click();
      URL.revokeObjectURL(url);
      return;
    }
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = sheetWidth * 2; canvas.height = sheetHeight * 2;
      const context = canvas.getContext("2d"); if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a"); link.href = url; link.download = "algorithm-study-sheet.png"; link.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    };
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  const loadChallenge = (item: Challenge) => {
    setCode(item.starter);
    setTests(item.tests.map(test => ({ ...test, id: uid("test") })));
    setInputs(item.tests[0]?.input ?? "");
    setOutput("");
    setTraceText("");
    setDiagnostics([]);
    setTab("write");
  };

  const importProject = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const project = JSON.parse(String(reader.result)) as Partial<Project>; if (project.code) setCode(project.code); if (Array.isArray(project.nodes)) setNodes(project.nodes); if (Array.isArray(project.edges)) setEdges(project.edges); if (Array.isArray(project.tests)) setTests(project.tests); } catch { setDiagnostics(["Could not import this algorithm project."]); } }; reader.readAsText(file); event.target.value = ""; };

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[#090d14] text-slate-200 shadow-xl">
    <header className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-[#0d121b] p-2"><div className="mr-2 px-2"><div className="text-xs font-semibold">Algorithm Studio</div><div className="text-[9px] text-slate-500">Learn · Design · Execute · Trace · Test · Analyse</div></div>{([["learn", "Learn", BookOpen], ["practice", "Practice", Target], ["write", "Pseudocode", Zap], ["flow", "Flowchart", Workflow], ["trace", "Trace", GitBranch], ["tests", "Tests", TestTube2], ["analyse", "Analyse", BarChart3], ["assess", "Assess", Target], ["logic", "Logic", Zap]] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setTab(id as Tab)} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] ${tab === id ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5"}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}<div className="ml-auto flex gap-1"><button onClick={save} title="Save locally" className="rounded-lg p-2 text-slate-500 hover:bg-white/5">{saved ? <Check className="h-4 w-4 text-emerald-400" /> : <Save className="h-4 w-4" />}</button><button onClick={exportProject} title="Export project JSON" className="rounded-lg p-2 text-slate-500 hover:bg-white/5"><Download className="h-4 w-4" /></button><button onClick={() => { setTab("flow"); window.setTimeout(() => exportFlowchartImage("png"), 80); }} title="Export flowchart PNG" className="rounded-lg p-2 text-slate-500 hover:bg-white/5"><FileImage className="h-4 w-4" /></button><label title="Import" className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-white/5"><Upload className="h-4 w-4" /><input className="hidden" type="file" accept=".json,application/json" onChange={importProject} /></label></div></header>

    {tab === "learn" && <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 p-3 lg:border-b-0 lg:border-r">
        <div className="mb-2 px-1 text-[9px] font-semibold uppercase tracking-widest text-slate-500">9618 algorithm map</div>
        <div className="space-y-1">{lessons.map(item => <button key={item.id} type="button" onClick={() => setLessonId(item.id)} className={`w-full rounded-xl px-3 py-2 text-left ${item.id === lesson.id ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5"}`}>
          <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold">{item.title}</span><span className="text-[8px] uppercase text-slate-600">{item.level}</span></div>
          <div className="mt-1 text-[9px] leading-4 text-slate-600">{item.summary}</div>
        </button>)}</div>
      </aside>
      <section className="p-4 sm:p-6">
        <div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><BookOpen className="h-5 w-5" /></div><div><div className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">{lesson.level} · Algorithm design</div><h2 className="mt-1 text-lg font-semibold text-white">{lesson.title}</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">{lesson.summary}</p></div></div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">Rule / pattern</div><pre className="mt-3 whitespace-pre-wrap rounded-xl bg-black/20 p-3 font-mono text-[11px] leading-5 text-slate-300">{lesson.rule}</pre></article>
          <article className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">Worked shape</div><pre className="mt-3 whitespace-pre-wrap rounded-xl bg-black/20 p-3 font-mono text-[11px] leading-5 text-slate-300">{lesson.example}</pre></article>
        </div>
        <div className="mt-3 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4"><div className="flex items-center gap-2 text-[10px] font-semibold text-amber-200"><Lightbulb className="h-4 w-4" />Exam thinking</div><p className="mt-2 text-xs leading-5 text-amber-100/70">{lesson.examTip}</p></div>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setTab("practice")} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-[10px] font-semibold text-white">Practice this skill</button><button type="button" onClick={() => setTab("write")} className="rounded-xl border border-white/10 px-4 py-2 text-[10px] text-slate-300">Open editor</button></div>
      </section>
    </div>}

    {tab === "practice" && <div className="grid lg:grid-cols-[310px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 p-3 lg:border-b-0 lg:border-r"><div className="mb-2 px-1 text-[9px] font-semibold uppercase tracking-widest text-slate-500">Guided problems</div><div className="space-y-2">{challenges.map(item => <button key={item.id} type="button" onClick={() => setChallengeId(item.id)} className={`w-full rounded-xl border p-3 text-left ${item.id === challenge.id ? "border-[var(--primary)]/40 bg-[var(--primary)]/5" : "border-white/10 hover:bg-white/[.03]"}`}><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-slate-200">{item.title}</span><span className="text-[8px] uppercase text-slate-600">{item.level}</span></div><div className="mt-1 text-[9px] text-slate-500">{item.skill}</div></button>)}</div></aside>
      <section className="p-4 sm:p-6"><div className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">{challenge.level} · {challenge.skill}</div><h2 className="mt-1 text-lg font-semibold text-white">{challenge.title}</h2><p className="mt-3 max-w-3xl text-xs leading-5 text-slate-400">{challenge.prompt}</p><div className="mt-4 rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-slate-600"><Lightbulb className="h-3.5 w-3.5" />Hint</div><p className="mt-2 text-xs leading-5 text-slate-400">{challenge.hint}</p></div><div className="mt-3 rounded-2xl border border-white/10 p-4"><div className="text-[9px] font-semibold uppercase tracking-widest text-slate-600">Automatic test cases</div><p className="mt-1 text-[9px] text-slate-500">These are the cases your algorithm must satisfy after you write it. More edge cases can be added in Tests.</p><div className="mt-3 space-y-2">{challenge.tests.length ? challenge.tests.map((test, index) => <div key={test.id} className="grid gap-2 rounded-lg bg-black/20 p-2 sm:grid-cols-2"><div><div className="text-[8px] uppercase text-slate-600">Input {index + 1}</div><pre className="mt-1 whitespace-pre-wrap font-mono text-[9px] text-slate-400">{test.input}</pre></div><div><div className="text-[8px] uppercase text-slate-600">Expected output</div><pre className="mt-1 whitespace-pre-wrap font-mono text-[9px] text-slate-400">{test.expected}</pre></div></div>) : <div className="rounded-lg bg-black/20 p-2 text-[9px] text-slate-600">No fixed tests yet. Build your own normal, boundary and failure cases.</div>}</div></div><button type="button" onClick={() => loadChallenge(challenge)} className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-[10px] font-semibold text-white"><Zap className="h-4 w-4" />Start question in editor</button></section>
    </div>}

    {tab === "assess" && <div className="p-4 sm:p-6"><AlgorithmAssessmentPanel /></div>}

    {tab === "logic" && <div className="space-y-4"><LogicCircuitsPanel /><div className="border-t border-white/10 pt-4"><BooleanLogicLab /></div></div>}

    {tab === "analyse" && <div className="p-4 sm:p-6">
      <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]"><BarChart3 className="h-5 w-5" /></div><div><div className="text-[9px] font-semibold uppercase tracking-widest text-slate-500">Algorithm analysis</div><h2 className="mt-1 text-lg font-semibold text-white">Understand the solution, not just the output</h2><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">These are learning heuristics, not proofs. Use them to ask better complexity and correctness questions.</p></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">Time</div><div className="mt-2 text-lg font-semibold text-white">{complexity.time}</div><p className="mt-2 text-[10px] leading-5 text-slate-500">{complexity.reason}</p></article>
        <article className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">Correctness</div><div className="mt-2 text-lg font-semibold text-white">Check every path</div><p className="mt-2 text-[10px] leading-5 text-slate-500">Ask whether every valid input reaches the required output and whether each branch is handled.</p></article>
        <article className="rounded-2xl border border-white/10 bg-white/[.02] p-4"><div className="text-[9px] uppercase tracking-widest text-slate-600">Boundary thinking</div><div className="mt-2 text-lg font-semibold text-white">Test the edges</div><p className="mt-2 text-[10px] leading-5 text-slate-500">Check 0, 1, lower/upper bounds, empty cases and exact threshold values.</p></article>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{[
        ["Termination", "Does every loop or recursive call have a stopping condition?"],
        ["Preconditions", "Does the algorithm rely on sorted data, fixed bounds or another assumption?"],
        ["Traceability", "Can you show the important variable values after each step?"],
        ["Algorithm choice", "Can you explain why this search, sort or loop structure fits the problem?"],
      ].map(([title, text]) => <div key={title} className="rounded-xl border border-white/10 p-3"><div className="text-[10px] font-semibold text-slate-300"><Check className="mr-1 inline h-3.5 w-3.5 text-emerald-400" />{title}</div><p className="mt-1 text-[9px] leading-4 text-slate-600">{text}</p></div>)}</div>
    </div>}

    {tab === "write" && <div className="grid lg:grid-cols-[minmax(0,1fr)_310px]"><section className="min-w-0 border-b border-white/10 lg:border-b-0 lg:border-r"><div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2"><span className="mr-auto text-[10px] font-semibold uppercase tracking-widest text-slate-500">main.pseudo · student-owned</span><button onClick={regenerate} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-slate-400"><Workflow className="h-3 w-3" />Flowchart</button><button disabled={running} onClick={run} className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"><Play className="h-3 w-3" />{running ? "Running" : "Run"}</button></div><textarea value={code} onChange={event => setCode(event.target.value)} spellCheck={false} className="min-h-[480px] w-full resize-y bg-[#070a10] p-5 font-mono text-[13px] leading-6 outline-none" /></section><aside className="space-y-3 p-4"><div className="rounded-xl border border-white/10 p-3"><div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Program input</div><p className="mt-1 text-[10px] leading-4 text-slate-500">One input value per line, consumed by INPUT statements in order.</p><textarea value={inputs} onChange={event => setInputs(event.target.value)} className="mt-2 min-h-20 w-full rounded-lg bg-black/20 p-2 font-mono text-xs outline-none" placeholder="8" /></div><div className="rounded-xl border border-white/10 p-3"><div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Algorithm toolkit</div><div className="mt-2 flex flex-wrap gap-1">{["INPUT", "OUTPUT", "IF / ELSE", "FOR", "WHILE", "REPEAT", "CASE", "ARRAYS", "PROCEDURES", "MOD / DIV"].map(item => <span key={item} className="rounded-full border border-white/10 px-2 py-1 text-[9px] text-slate-500">{item}</span>)}</div></div>{diagnostics.length > 0 && <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-[10px] leading-5 text-red-300">{diagnostics.map(item => <div key={item}>{item}</div>)}</div>}<div className="rounded-xl border border-white/10 p-3"><div className="text-[9px] uppercase tracking-widest text-slate-600">Output</div><pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-slate-400">{output || "Run the algorithm to see its output and trace."}</pre></div></aside></div>}

    {tab === "flow" && <div className="grid lg:grid-cols-[minmax(0,1fr)_290px]"><section className="min-h-[680px] overflow-hidden border-b border-white/10 bg-[#070a10] lg:border-b-0 lg:border-r"><div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2"><span className="text-[10px] uppercase tracking-widest text-slate-500">Flowchart builder · linked to pseudocode</span><div className="ml-auto flex flex-wrap gap-1.5"><button onClick={regenerate} className="rounded-lg border border-white/10 px-2 py-1.5 text-[10px]">Sync from pseudocode</button><button onClick={() => exportFlowchartImage("svg")} className="rounded-lg border border-white/10 px-2 py-1.5 text-[10px]">Export SVG</button><button onClick={() => exportFlowchartImage("png")} className="rounded-lg border border-white/10 px-2 py-1.5 text-[10px]">Export PNG</button><button onClick={() => exportStudySheet("svg")} className="rounded-lg border border-white/10 px-2 py-1.5 text-[10px]">Study Sheet</button></div></div><div className="overflow-auto p-3"><svg ref={svgRef} viewBox="0 0 760 620" className="min-h-[620px] w-full min-w-[720px] touch-none" onPointerMove={moveDrag} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onClick={() => setSelected(null)}><defs><marker id="algorithm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="currentColor" /></marker></defs>{edges.map(edge => { const from = nodes.find(node => node.id === edge.from); const to = nodes.find(node => node.id === edge.to); if (!from || !to) return null; return <g key={edge.id}><line x1={from.x} y1={from.y + 40} x2={to.x} y2={to.y - 40} stroke="currentColor" opacity=".45" strokeWidth="2" markerEnd="url(#algorithm-arrow)" /><line x1={from.x} y1={from.y + 40} x2={to.x} y2={to.y - 40} stroke="transparent" strokeWidth="10" />{edge.label && <text x={(from.x + to.x) / 2 + 8} y={(from.y + to.y) / 2} fontSize="10" fill="currentColor" opacity=".75">{edge.label}</text>}</g>; })}{nodes.map(node => <g key={node.id} transform={`translate(${node.x} ${node.y})`} onPointerDown={event => { event.stopPropagation(); startDrag(event, node); }} onClick={event => { event.stopPropagation(); setSelected(node.id); }} onDoubleClick={() => { const next = window.prompt("Edit flowchart text", node.text); if (next !== null) editNode(node.id, next); }}><path d={shape(node.kind)} fill="#0d1520" stroke={selected === node.id ? "white" : colors[node.kind]} strokeWidth={selected === node.id ? 3 : 2} /><text textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="white">{shortText(node.text)}</text></g>)}</svg></div></section><aside className="p-4"><div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Shapes</div><div className="mt-2 grid grid-cols-2 gap-2">{kinds.map(kind => <button key={kind} onClick={() => addNode(kind)} className="rounded-xl border border-white/10 p-2 text-left text-[10px] hover:bg-white/5"><span className="block font-semibold" style={{ color: colors[kind] }}>{labels[kind]}</span><span className="text-[9px] text-slate-600">Add shape</span></button>)}</div>{selected && <div className="mt-3 rounded-xl border border-white/10 p-3"><div className="text-[9px] uppercase tracking-widest text-slate-600">Selected node</div><select value={nodes.find(node => node.id === selected)?.kind ?? "process"} onChange={event => setNodes(current => current.map(node => node.id === selected ? { ...node, kind: event.target.value as Kind } : node))} className="mt-2 w-full rounded-lg bg-black/30 p-2 text-xs">{kinds.map(kind => <option key={kind} value={kind}>{labels[kind]}</option>)}</select><input value={nodes.find(node => node.id === selected)?.text ?? ""} onChange={event => editNode(selected, event.target.value)} className="mt-2 w-full rounded-lg bg-black/30 p-2 text-xs" /><button onClick={removeNode} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-red-400/20 p-2 text-[10px] text-red-300"><Trash2 className="h-3 w-3" />Remove</button></div>}<div className="mt-3 rounded-xl border border-white/10 p-3 text-[10px] leading-5 text-slate-500"><GitBranch className="mr-1 inline h-3 w-3" />IF/ELSE branches are labelled TRUE/FALSE. Drag nodes to arrange the diagram.</div></aside></div>}

    {tab === "trace" && <div className="p-4"><div className="mb-3 flex items-center justify-between"><div><div className="text-xs font-semibold">Execution trace</div><div className="text-[10px] text-slate-500">Evidence emitted by the pseudocode runtime.</div></div><button onClick={run} disabled={running} className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-[10px] text-white"><Play className="h-3 w-3" />Run again</button></div>{trace.length ? <div className="overflow-auto rounded-xl border border-white/10"><table className="w-full min-w-[620px] text-left text-[10px]"><thead><tr className="border-b border-white/10 bg-white/[.03]">{trace[0].map(([header]) => <th key={header} className="px-3 py-2 font-semibold text-slate-500">{header}</th>)}</tr></thead><tbody>{trace.map((row, index) => <tr key={index} className="border-b border-white/5">{row.map(([header, value]) => <td key={header} className="px-3 py-2 font-mono text-slate-400">{value}</td>)}</tr>)}</tbody></table></div> : <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-xs text-slate-600">Run an algorithm to generate a trace table.</div>}</div>}

    {tab === "tests" && (
      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="mr-auto">
            <div className="text-xs font-semibold">Student test cases</div>
            <div className="text-[10px] text-slate-500">Build normal, boundary and invalid cases, then inspect exactly where the solution fails.</div>
          </div>
          <button type="button" onClick={() => { setTests(current => [...current, { id: uid("test"), input: "", expected: "" }]); setTestResults([]); }} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-[10px]">
            <Plus className="h-3 w-3" />Add case
          </button>
          <button type="button" onClick={runTests} disabled={running} className="flex items-center gap-1 rounded-lg bg-[var(--primary)] px-3 py-2 text-[10px] text-white">
            <Play className="h-3 w-3" />Run tests
          </button>
        </div>
        <div className="space-y-2">
          {tests.map((test, index) => (
            <div key={test.id} className="grid gap-2 rounded-xl border border-white/10 p-3 md:grid-cols-[90px_1fr_1fr_auto]">
              <span className="pt-2 text-[10px] text-slate-600">CASE {index + 1}</span>
              <textarea value={test.input} onChange={event => { setTestResults([]); setTests(current => current.map(item => item.id === test.id ? { ...item, input: event.target.value } : item)); }} placeholder="Input" className="min-h-14 rounded-lg bg-black/20 p-2 font-mono text-xs outline-none" />
              <textarea value={test.expected} onChange={event => { setTestResults([]); setTests(current => current.map(item => item.id === test.id ? { ...item, expected: event.target.value } : item)); }} placeholder="Expected output" className="min-h-14 rounded-lg bg-black/20 p-2 font-mono text-xs outline-none" />
              <button type="button" onClick={() => { setTestResults([]); setTests(current => current.filter(item => item.id !== test.id)); }} className="self-start rounded-lg p-2 text-slate-600 hover:text-red-300">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {testResults.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/10 p-3">
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold">Test report</div>
              <span className="text-[9px] text-slate-500">{testResults.filter(item => item.passed).length}/{testResults.length} passed</span>
            </div>
            <div className="mt-3 space-y-2">
              {testResults.map((item, index) => (
                <div key={item.id} className={item.passed ? "rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3" : "rounded-xl border border-red-500/20 bg-red-500/5 p-3"}>
                  <div className="flex items-center gap-2 text-[10px] font-semibold">
                    <span>{item.passed ? "✓ PASS" : "✕ FAIL"}</span>
                    <span className="text-slate-500">CASE {index + 1}</span>
                  </div>
                  <div className="mt-2 grid gap-2 text-[9px] sm:grid-cols-3">
                    <div><div className="text-slate-600">Input</div><pre className="mt-1 whitespace-pre-wrap font-mono text-slate-400">{item.input}</pre></div>
                    <div><div className="text-slate-600">Expected</div><pre className="mt-1 whitespace-pre-wrap font-mono text-slate-400">{item.expected || "∅"}</pre></div>
                    <div><div className="text-slate-600">Actual</div><pre className="mt-1 whitespace-pre-wrap font-mono text-slate-400">{item.actual || item.error || "∅"}</pre></div>
                  </div>
                  {!item.passed && <div className="mt-2 text-[9px] text-amber-200/80">{item.error ? "Runtime/diagnostic: " + item.error : "The program ran, but its output did not match the expected result. Check boundaries, branches, loop bounds and output formatting."}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {output && <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 p-3 font-mono text-[10px] text-slate-400">{output}</pre>}
      </div>
    )}

    <footer className="border-t border-white/10 px-4 py-3 text-[9px] text-slate-600">Pseudocode ↔ flowchart · Execute · Trace · Test · Analyse · Assess. Exports include editable JSON and publication-ready SVG/PNG flowcharts.</footer>
    </div>
  );
}
