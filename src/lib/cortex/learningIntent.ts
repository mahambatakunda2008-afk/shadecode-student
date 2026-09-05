export type LearningIntent =
  | "learn"
  | "remediate"
  | "exam-prep"
  | "practice"
  | "deep-dive"
  | "guided-solve"
  | "review"
  | "from-scratch";

export interface LearningIntentResult {
  intent: LearningIntent;
  confidence: "high" | "medium" | "low";
  reason: string;
}

const RULES: Array<{ intent: LearningIntent; patterns: RegExp[]; reason: string }> = [
  { intent: "remediate", patterns: [/keep getting/i, /always get.*wrong/i, /don't understand/i, /do not understand/i, /struggling/i, /weak at/i, /confused/i, /wrong/i], reason: "The learner signals confusion, repeated errors, or a weak area." },
  { intent: "exam-prep", patterns: [/exam/i, /test/i, /revision/i, /revise/i, /tomorrow/i, /next week/i, /past paper/i, /mark scheme/i], reason: "The request is framed around assessment preparation or revision." },
  { intent: "practice", patterns: [/give me.*question/i, /practice/i, /quiz/i, /questions on/i, /test me/i, /drill/i], reason: "The learner explicitly asks to practise or be tested." },
  { intent: "guided-solve", patterns: [/help me solve/i, /how do i solve/i, /walk me through/i, /show me how to solve/i, /stuck on/i], reason: "The learner wants guided problem solving rather than a standalone lesson." },
  { intent: "deep-dive", patterns: [/why does/i, /why is/i, /derive/i, /in depth/i, /deep dive/i, /first principles/i, /prove/i], reason: "The request asks for causal, foundational, or rigorous explanation." },
  { intent: "from-scratch", patterns: [/from scratch/i, /know nothing/i, /beginner/i, /start from basics/i, /teach me the basics/i], reason: "The learner explicitly asks to begin from foundational knowledge." },
  { intent: "review", patterns: [/quickly/i, /quick review/i, /recap/i, /summary/i, /summarise/i, /summarize/i, /refresh/i], reason: "The learner requests a concise review rather than a full lesson." },
];

export function resolveLearningIntent(prompt: string, goal = "") : LearningIntentResult {
  const input = `${prompt.trim()} ${goal.trim()}`.trim();
  for (const rule of RULES) {
    if (rule.patterns.some(pattern => pattern.test(input))) {
      return { intent: rule.intent, confidence: "high", reason: rule.reason };
    }
  }
  return {
    intent: "learn",
    confidence: prompt.trim() ? "medium" : "low",
    reason: "No specialised learning mode was requested, so Cortex will teach the requested topic directly.",
  };
}

export function buildIntentInstruction(result: LearningIntentResult) {
  const instructions: Record<LearningIntent, string> = {
    learn: "Teach the requested concept directly. Establish the core idea, definitions, reasoning, example, checks, application, practice, and summary.",
    remediate: "Teach diagnostically. Identify likely misconception(s), repair the prerequisite idea, contrast the correct and incorrect reasoning, then use a targeted example and a check to verify understanding.",
    "exam-prep": "Prioritise examinable knowledge, command words, mark-worthy reasoning, common traps, timing/strategy, and representative exam-style questions. Keep explanations concise but rigorous.",
    practice: "Prioritise active recall. Give a short setup, then progressively harder questions. Include answers or guidance separately so the learner can attempt each question first.",
    "deep-dive": "Start from first principles and explain causality. Derive or justify important relationships where appropriate, expose assumptions, and connect the concept to deeper consequences.",
    "guided-solve": "Act as a tutor. Break the problem into small decisions, ask or expose the next useful step, explain why it works, and avoid jumping straight to the final answer.",
    review: "Produce a high-yield revision pass. Focus on essential definitions, relationships, formulas, distinctions, traps, and a few rapid checks. Avoid unnecessary exposition.",
    "from-scratch": "Assume the learner has no reliable prerequisite knowledge. Build a short prerequisite ladder, introduce the concept from first principles, use plain language first, then introduce formal notation and practice.",
  };
  return instructions[result.intent];
}
