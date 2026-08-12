/**
 * Compact local inference primitives for Cortex.
 *
 * This is intentionally dependency-free and deterministic. It provides a
 * useful edge inference baseline without pretending to be a full LLM.
 * The implementation is designed so a real quantized model can replace the
 * scorer later without changing Cortex's routing contract.
 */

export interface CompactInferenceResult {
  answer: string;
  confidence: number;
  intent: "definition" | "explanation" | "calculation" | "comparison" | "unknown";
  tokensProcessed: number;
}

const DEFINITIONS = ["what is", "define", "meaning of", "what are"];
const EXPLANATIONS = ["why", "explain", "how does", "how do", "describe"];
const COMPARISONS = ["compare", "difference between", "contrast", "versus", " vs "];

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function detectIntent(question: string): CompactInferenceResult["intent"] {
  const q = normalize(question);
  if (DEFINITIONS.some((x) => q.includes(x))) return "definition";
  if (COMPARISONS.some((x) => q.includes(x))) return "comparison";
  if (EXPLANATIONS.some((x) => q.includes(x))) return "explanation";
  if (/\d/.test(q) && /[+\-*/=]|calculate|solve|find/.test(q)) return "calculation";
  return "unknown";
}

/**
 * Small deterministic scorer. No network, no model download, no runtime
 * dependency. Useful for fast edge routing and as a benchmark target.
 */
export function compactInfer(question: string): CompactInferenceResult {
  const normalized = normalize(question);
  const tokensProcessed = normalized ? normalized.split(" ").length : 0;
  const intent = detectIntent(normalized);

  const answerByIntent: Record<CompactInferenceResult["intent"], string> = {
    definition: "A concise definition should be generated from the learner's curriculum context.",
    explanation: "Break the concept into cause, mechanism, and consequence, using the learner's level.",
    calculation: "Identify the known values, choose the governing relation, then calculate and verify units.",
    comparison: "Compare the concepts by definition, key properties, similarities, differences, and examples.",
    unknown: "Use the learner's context to determine the task, then provide a concise step-by-step answer.",
  };

  const confidence = intent === "unknown" ? 0.35 : 0.8;

  return {
    answer: answerByIntent[intent],
    confidence,
    intent,
    tokensProcessed,
  };
}
