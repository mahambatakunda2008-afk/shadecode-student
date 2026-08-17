/** Cortex TeacherAI: tutoring-focused wrapper around the shared AI gateway. */
import { callAI } from "@/lib/ai";

const TEACHER_SYSTEM_PROMPT = `You are a knowledgeable and patient tutor within Shadecode Student.
Explain concepts clearly and pedagogically, break complex topics into steps, ask guiding questions, provide examples, admit uncertainty, and avoid jargon without defining it.
Do not give homework solutions without explanation. Keep answers educational, concise but thorough.`;

export class TeacherAI {
  async generateResponse(question: string, context?: Record<string, unknown>, userId?: string): Promise<string> {
    const safeQuestion = question.trim().slice(0, 12000);
    if (!safeQuestion) return "Please enter a question so I can help you learn.";
    try {
      const prompt = this.buildPrompt(safeQuestion, context);
      const response = await callAI(prompt, 1800, { userId, feature: "cortex", subfeature: "teacher" });
      return response ? this.cleanResponse(response) : this.getFallbackResponse(safeQuestion);
    } catch (error) {
      console.error("[TeacherAI] Error:", error);
      return this.getFallbackResponse(safeQuestion);
    }
  }

  private buildPrompt(question: string, context?: Record<string, unknown>): string {
    let prompt = `${TEACHER_SYSTEM_PROMPT}\n\nStudent Question:\n${question}`;
    if (context) {
      const contextStr = Object.entries(context)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => `${key}: ${JSON.stringify(value).slice(0, 3000)}`)
        .join("\n");
      if (contextStr) prompt += `\n\nContext:\n${contextStr}`;
    }
    return prompt;
  }

  private cleanResponse(response: string): string {
    return response.trim().replace(/^```[\w]*\n?/i, "").replace(/\n?```$/i, "").replace(/\s+/g, " ").trim();
  }

  private getFallbackResponse(question: string): string {
    return `I can't reach the tutoring service right now. Your question about "${question.slice(0, 80)}${question.length > 80 ? "…" : ""}" is saved in context; please try again when the AI service reconnects.`;
  }
}

export const teacherAI = new TeacherAI();
