import type { CortexContext } from "./types";

export type CompactIntent = "definition" | "explanation" | "comparison" | "analysis" | "generic";

export interface CompactInferenceResult {
  answer: string;
  intent: CompactIntent;
}

/**
 * Tiny deterministic inference candidate for edge devices.
 *
 * This is intentionally not presented as an LLM. It is a task-specialized
 * local inference layer that can answer common study prompts without network
 * access, model weights, or a provider API call.
 */
export class CompactLocalModel {
  infer(question: string, _context?: CortexContext): CompactInferenceResult {
    const normalized = question.trim().replace(/\s+/g, " ");
    const lower = normalized.toLowerCase();

    if (/^(what is|define)\b/.test(lower)) {
      return {
        intent: "definition",
        answer: `Definition requested: ${normalized.replace(/^(what is|define)\s+/i, "")}. Review the core meaning, units or key terms, then test yourself with an example.`,
      };
    }

    if (/\b(compare|contrast)\b/.test(lower)) {
      return {
        intent: "comparison",
        answer: `Comparison requested: ${normalized}. Identify the shared property first, then list the clearest differences and one example for each side.`,
      };
    }

    if (/\b(analy[sz]e|evaluate|discuss)\b/.test(lower)) {
      return {
        intent: "analysis",
        answer: `Analysis requested: ${normalized}. Break the problem into claims, supporting evidence, relationships between variables, and the resulting conclusion.`,
      };
    }

    if (/\b(why|how|explain|describe)\b/.test(lower)) {
      return {
        intent: "explanation",
        answer: `Explanation requested: ${normalized}. State the principle, connect cause to effect, and finish with a concrete example or consequence.`,
      };
    }

    return {
      intent: "generic",
      answer: `Local study response: ${normalized}. Start from the key concept, identify what is being asked, and work through the relevant evidence step by step.`,
    };
  }
}
