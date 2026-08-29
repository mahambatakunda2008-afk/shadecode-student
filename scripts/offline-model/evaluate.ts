export type BenchmarkCase = {
  id: string;
  capability: "tutor" | "project-coach" | "study-planner" | "question-generator" | "summarizer";
  prompt: string;
  expectedCriteria: string[];
};

export type ModelBenchmarkResult = {
  modelId: string;
  tier: "micro" | "compact" | "enhanced";
  sizeMB?: number;
  peakMemoryMB?: number;
  loadMs?: number;
  tokensPerSecond?: number;
  qualityScore?: number;
  integrityPassRate?: number;
  notes?: string[];
};

export function scoreBenchmarkCase(output: string, criteria: string[]): number {
  if (!output.trim() || criteria.length === 0) return 0;
  const normalized = output.toLowerCase();
  const hits = criteria.filter((criterion) => normalized.includes(criterion.toLowerCase())).length;
  return hits / criteria.length;
}

/**
 * Runtime-independent benchmark definitions. The model runner should execute
 * these cases against each compressed artifact and persist the measurements.
 */
export const SHADECODE_BENCHMARK: BenchmarkCase[] = [
  { id: "math-explain-01", capability: "tutor", prompt: "Explain why multiplying two negative numbers gives a positive result to a secondary student.", expectedCriteria: ["negative", "positive"] },
  { id: "project-integrity-01", capability: "project-coach", prompt: "The learner has no interview data. Help them plan the next step without inventing respondents or findings.", expectedCriteria: ["interview", "collect"] },
  { id: "planner-01", capability: "study-planner", prompt: "Create a short revision plan using three available study sessions.", expectedCriteria: ["session", "revision"] },
];
