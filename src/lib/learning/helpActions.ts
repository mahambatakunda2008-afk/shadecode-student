export type LearningHelpAction = "clearer_hint" | "more_detail" | "different_method" | "worked_solution" | "why_this_step";
export type LearningHelpLevel = "hint" | "method" | "solution";

export interface LearningHelpActionDefinition {
  id: LearningHelpAction;
  label: string;
  prompt: string;
  level: LearningHelpLevel;
}

export const LEARNING_HELP_ACTIONS: readonly LearningHelpActionDefinition[] = [
  {
    id: "clearer_hint",
    label: "Make the hint clearer",
    prompt: "My current hint is not clear enough. Give one specific next step using the actual question and my work, without skipping the reasoning.",
    level: "hint",
  },
  {
    id: "more_detail",
    label: "Show more detail",
    prompt: "Explain the current problem in more detail. Show the key reasoning steps and define any important terms. Do not pad the explanation.",
    level: "solution",
  },
  {
    id: "different_method",
    label: "Try another method",
    prompt: "Show a different valid method for the current problem and briefly explain when it is useful. If no genuinely different valid method applies, say so.",
    level: "method",
  },
  {
    id: "worked_solution",
    label: "Show worked solution",
    prompt: "Give a worked solution with the necessary reasoning for each step. Then offer one similar question I can solve independently.",
    level: "solution",
  },
  {
    id: "why_this_step",
    label: "Explain why",
    prompt: "Explain why this step or question matters and how it helps solve the problem. Connect it to the actual task rather than giving a generic explanation.",
    level: "hint",
  },
] as const;

export function getLearningHelpAction(action: LearningHelpAction): LearningHelpActionDefinition {
  return LEARNING_HELP_ACTIONS.find((item) => item.id === action) ?? LEARNING_HELP_ACTIONS[0];
}

export function buildLearningHelpPrompt(question: string, studentRequest: string, feedback?: string): string {
  const parts = [
    question.trim(),
    `Student request: ${studentRequest.trim()}`,
    feedback?.trim() ? `Existing feedback to address: ${feedback.trim()}` : "",
  ].filter(Boolean);
  return parts.join("\n\n");
}
