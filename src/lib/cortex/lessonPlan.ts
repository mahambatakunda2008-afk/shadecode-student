import type { LearningIntent, LearningIntentResult } from "@/lib/cortex/learningIntent";

export type LessonPlanStage =
  | "objective"
  | "prerequisite"
  | "concept"
  | "definition"
  | "formula"
  | "worked-example"
  | "checkpoint"
  | "misconception"
  | "exam-application"
  | "practice"
  | "summary"
  | "strategy";

export interface LessonPlan {
  intent: LearningIntent;
  levelStyle: string;
  sequence: LessonPlanStage[];
  contract: string[];
}

const LEVEL_STYLES: Array<[RegExp, string]> = [
  [/primary/i, "Use concrete everyday contexts, short sentences, visual or tangible descriptions, tiny steps, and encouraging checks. Introduce formal vocabulary only after the idea is concrete."],
  [/secondary/i, "Build intuition first, then formalise it. Use relatable examples, exploration, clear terminology, and increasingly precise reasoning."],
  [/igcse/i, "Use syllabus-style terminology, structured explanations, required relationships, command-word awareness, and concise exam application without inventing a specification."],
  [/(?:as level|a level)/i, "Use rigorous definitions, correct notation, assumptions, derivations where useful, units and conditions, precise reasoning, and exam-mark language appropriate to Cambridge or the supplied board."],
  [/university/i, "Use formal concepts, assumptions, mathematical or technical precision, deeper connections, limitations, and evidence of reasoning rather than school-level simplification."],
  [/polytechnic/i, "Prioritise applied understanding, procedures, practical cases, tools, decision points, troubleshooting, and how the concept is used in real work."],
];

const INTENT_SEQUENCE: Record<LearningIntent, LessonPlanStage[]> = {
  learn: ["objective", "prerequisite", "concept", "definition", "formula", "worked-example", "checkpoint", "misconception", "exam-application", "practice", "summary", "strategy"],
  remediate: ["objective", "prerequisite", "misconception", "concept", "definition", "worked-example", "checkpoint", "exam-application", "practice", "summary", "strategy"],
  "exam-prep": ["objective", "prerequisite", "concept", "definition", "formula", "exam-application", "worked-example", "misconception", "checkpoint", "practice", "summary", "strategy"],
  practice: ["objective", "prerequisite", "concept", "worked-example", "checkpoint", "practice", "misconception", "exam-application", "summary", "strategy"],
  "deep-dive": ["objective", "prerequisite", "concept", "definition", "formula", "worked-example", "checkpoint", "misconception", "exam-application", "practice", "summary", "strategy"],
  "guided-solve": ["objective", "prerequisite", "concept", "worked-example", "checkpoint", "misconception", "exam-application", "practice", "summary", "strategy"],
  review: ["objective", "concept", "definition", "formula", "misconception", "exam-application", "checkpoint", "practice", "summary", "strategy"],
  "from-scratch": ["objective", "prerequisite", "concept", "definition", "formula", "worked-example", "checkpoint", "misconception", "exam-application", "practice", "summary", "strategy"],
};

const INTENT_CONTRACTS: Record<LearningIntent, string[]> = {
  learn: ["Teach the requested concept directly", "Establish prerequisites before relying on them", "Show reasoning rather than only conclusions", "End with targeted practice"],
  remediate: ["Diagnose likely misconceptions", "Repair prerequisite gaps", "Contrast incorrect and correct reasoning", "Verify the repair with a targeted check"],
  "exam-prep": ["Prioritise examinable knowledge", "Make mark-worthy reasoning explicit", "Use command words and common traps where relevant", "Include representative exam application and timed-practice advice"],
  practice: ["Keep setup concise", "Progress from accessible to challenging questions", "Delay answers or place guidance after the questions", "Use errors and traps to guide feedback"],
  "deep-dive": ["Start from first principles", "Explain causality and assumptions", "Derive or justify important relationships", "Connect the idea to consequences and limitations"],
  "guided-solve": ["Decompose the problem into decisions", "Reveal the next useful step and why", "Use hints before final answers", "Check the learner's reasoning at decision points"],
  review: ["Compress to high-yield essentials", "Prioritise definitions, relationships and distinctions", "Surface traps and rapid checks", "Avoid unnecessary exposition"],
  "from-scratch": ["Build a prerequisite ladder", "Explain plainly before formal notation", "Introduce terminology progressively", "Verify foundations before increasing difficulty"],
};

export function buildLessonPlan(input: {
  intent: LearningIntentResult;
  level?: string;
  examBoard?: string;
  subject?: string;
}): LessonPlan {
  const level = input.level?.trim() || "";
  const style = LEVEL_STYLES.find(([pattern]) => pattern.test(level))?.[1]
    ?? "Use precise but accessible language. Match the learner's demonstrated level and do not invent curriculum requirements.";
  const board = input.examBoard?.trim();
  const boardContract = board ? `Use the supplied ${board} curriculum/exam context where relevant, but do not invent syllabus details.` : "Do not invent an exam board or syllabus requirement.";
  return {
    intent: input.intent.intent,
    levelStyle: style,
    sequence: INTENT_SEQUENCE[input.intent.intent],
    contract: [...INTENT_CONTRACTS[input.intent.intent], boardContract, "Preserve the learner's exact request and subject as the source of truth."],
  };
}

export function formatLessonPlan(plan: LessonPlan) {
  return [
    `Pedagogical sequence: ${plan.sequence.join(" -> ")}`,
    `Level style: ${plan.levelStyle}`,
    `Teaching contract: ${plan.contract.map(item => `- ${item}`).join("\\n")}`,
  ].join("\\n");
}
