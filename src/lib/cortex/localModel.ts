// src/lib/cortex/localModel.ts

import { CortexContext } from "./types";

export class LocalModel {
  /**
   * Main generation method (recommended standard)
   */
  async generate(question: string, context?: Context): Promise<string> {
    // 🔮 Replace this with your real logic (rules, small LLM, etc.)

    const memoryHint = context?.history?.length
      ? `I remember some context.`
      : `No prior context.`;

    return `🧠 LocalModel answer:
Question: ${question}
${memoryHint}`;
  }

  /**
   * Alias method (kept for backward compatibility)
   * Your router supports both generate() and generateResponse()
   */
  async generateResponse(
    question: string,
    context?: CortexContext
  ): Promise<string> {
    return this.generate(question, context);
  }
}
