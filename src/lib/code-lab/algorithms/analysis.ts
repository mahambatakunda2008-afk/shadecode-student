export type ComplexityClass = "O(1)" | "O(log n)" | "O(n)" | "O(n log n)" | "O(n²)" | "O(n³)" | "O(2^n)" | "O(?)";

export type AlgorithmAnalysis = {
  time: ComplexityClass;
  space: ComplexityClass;
  confidence: "high" | "medium" | "low";
  findings: string[];
  warnings: string[];
};

/** Lightweight educational analysis. This is a heuristic, not a proof of asymptotic complexity. */
export function analyzeAlgorithm(source: string): AlgorithmAnalysis {
  const lines = source.split(/\r?\n/).map(line => line.replace(/\/\/.*$/, "").trim()).filter(Boolean);
  const loops = lines.filter(line => /^(FOR|WHILE|REPEAT)\b/i.test(line));
  const nestedLoops = /(?:FOR|WHILE|REPEAT)\b[\s\S]{0,120}(?:FOR|WHILE|REPEAT)\b/i.test(source);
  const tripleNested = /(?:FOR|WHILE|REPEAT)[\s\S]{0,160}(?:FOR|WHILE|REPEAT)[\s\S]{0,160}(?:FOR|WHILE|REPEAT)/i.test(source);
  const halves = lines.some(line => /\b(?:DIV\s+2|\/\s*2|\*\s*2)\b/i.test(line));
  const recursion = /^(?:FUNCTION|PROCEDURE)\s+(\w+)/im.test(source) && (() => {
    const names = [...source.matchAll(/^(?:FUNCTION|PROCEDURE)\s+(\w+)/gim)].map(match => match[1]);
    return names.some(name => new RegExp(`\\bCALL\\s+${name}\\b|\\b${name}\\s*\\(`, "i").test(source));
  })();
  const sorting = /SORT|QUICKSORT|MERGESORT|BUBBLE SORT/i.test(source);
  const arrayScan = /\b(?:LENGTH|SIZE)\s*\(|\b\w+\s*\[\s*\w+\s*\]/i.test(source);

  let time: ComplexityClass = "O(1)";
  let confidence: AlgorithmAnalysis["confidence"] = "medium";
  const findings: string[] = [];
  const warnings: string[] = [];

  if (tripleNested) { time = "O(n³)"; findings.push("Three nested repetition structures were detected."); confidence = "medium"; }
  else if (nestedLoops) { time = "O(n²)"; findings.push("Nested repetition structures were detected."); confidence = "medium"; }
  else if (sorting && /MERGESORT/i.test(source)) { time = "O(n log n)"; findings.push("Merge-sort style processing was detected."); confidence = "low"; }
  else if (sorting) { time = "O(n²)"; findings.push("Sorting is present; the specific algorithm determines the actual bound."); confidence = "low"; }
  else if (halves) { time = "O(log n)"; findings.push("A repeated halving/doubling pattern was detected."); confidence = "low"; }
  else if (loops.length) { time = "O(n)"; findings.push("A repetition structure was detected."); confidence = "medium"; }
  else if (recursion) { time = "O(?)"; findings.push("Recursion was detected. Its recurrence needs deeper analysis."); confidence = "low"; }
  else { findings.push("No repetition or recursion was detected, so the visible work is treated as constant."); confidence = "medium"; }

  let space: ComplexityClass = "O(1)";
  if (arrayScan) { space = "O(n)"; findings.push("An array/list access pattern was detected; storage may grow with input size."); }
  if (recursion) { space = "O(n)"; findings.push("Recursive calls can add call-stack space proportional to recursion depth."); }
  if (source.length > 5000) warnings.push("Large algorithms can contain control flow that this lightweight analyzer cannot fully model.");
  if (confidence === "low") warnings.push("Treat this complexity as a learning hint. Verify it by reasoning about the algorithm and its input size.");
  if (sorting) warnings.push("Sorting complexity depends on the actual algorithm and implementation, not the word SORT alone.");

  return { time, space, confidence, findings, warnings };
}
