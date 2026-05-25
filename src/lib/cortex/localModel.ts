// src/lib/cortex/localModel.ts

import { CortexContext } from "./types";

/**
 * LocalModel
 * Lightweight local AI layer for simple reasoning tasks.
 * Acts as fallback or fast-response engine.
 */
export class LocalModel {
  /**
   * Main generation method
   */
  async generate(
    question: string,
    context?: CortexContext
  ): Promise<string> {
    // 🧠 Example lightweight reasoning logic
    const hasHistory = Array.isArray(context?.history) && context.history.length > 0;
    const hasSnapshot = !!context?.snapshot;

    const memoryHint = hasHistory
      ? "I can see your recent activity."
      : "No recent history available.";

    const snapshotHint = hasSnapshot
      ? `Current level: ${context?.snapshot?.level ?? "unknown"}`
      : "No snapshot data.";

    // 🔮 Replace this with real local model logic later (rules / small LLM / embeddings)
    return `
🧠 LocalModel Response
----------------------
Question: ${question}

Context:
- ${memoryHint}
- ${snapshotHint}

Answer:
This is a lightweight local response engine. Replace with real inference logic.
`.trim();
  }

  /**
   * Backward compatibility alias
   * (prevents router breakage if it still calls generateResponse)
   */
  async generateResponse(
    question: string,
    context?: CortexContext
  ): Promise<string> {
    return this.generate(question, context);
  }
}
