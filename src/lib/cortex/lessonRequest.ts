import { buildIntentInstruction, resolveLearningIntent, type LearningIntentResult } from "@/lib/cortex/learningIntent";

export interface LessonRequest {
  prompt: string;
  subject?: string;
  topic?: string;
  level?: string;
  difficulty?: "easy" | "medium" | "hard";
  goal?: string;
  examBoard?: string;
}

const SUBJECT_ALIASES: Record<string, string> = {
  maths: "Mathematics",
  math: "Mathematics",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  computer: "Computer Science",
  computing: "Computer Science",
  cs: "Computer Science",
  computers: "Computer Science",
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function inferSubject(prompt: string) {
  const lower = prompt.toLowerCase();
  for (const [alias, subject] of Object.entries(SUBJECT_ALIASES)) {
    if (new RegExp(`\\b${alias}\\b`, "i").test(lower)) return subject;
  }
  return "";
}

export function resolveLessonRequest(input: LessonRequest) {
  const prompt = clean(input.prompt, 500);
  const explicitSubject = clean(input.subject, 100);
  const inferredSubject = explicitSubject ? "" : inferSubject(prompt);
  const subject = explicitSubject || inferredSubject;
  const topic = clean(input.topic, 500) || prompt;
  const difficulty = input.difficulty === "easy" || input.difficulty === "hard" ? input.difficulty : "medium";
  const shortPrompt = prompt.length > 0 && prompt.length <= 3;
  const intent = resolveLearningIntent(prompt, clean(input.goal, 300));

  return {
    prompt,
    subject,
    topic,
    level: clean(input.level, 80),
    goal: clean(input.goal, 300),
    examBoard: clean(input.examBoard, 100),
    difficulty,
    intent,
    ambiguousSubject: !explicitSubject && !inferredSubject,
    shortPrompt,
    needsClarification: !prompt || shortPrompt,
  };
}

export function buildResolvedLessonPrompt(request: ReturnType<typeof resolveLessonRequest>) {
  const context = [
    request.subject && `Subject: ${request.subject}`,
    request.level && `Education level: ${request.level}`,
    request.examBoard && `Exam/curriculum: ${request.examBoard}`,
    request.goal && `Learning goal: ${request.goal}`,
    `Difficulty: ${request.difficulty}`,
    `Learning intent: ${request.intent.intent} (${request.intent.confidence} confidence)`,
    `Teaching strategy: ${buildIntentInstruction(request.intent)}`,
  ].filter(Boolean).join("\n");

  const ambiguityRule = request.ambiguousSubject
    ? "The subject is unresolved. Do not guess it. Ask for the subject before generating substantive subject-specific teaching."
    : "The subject is resolved by learner context. Do not replace it with an inferred subject from the prompt.";

  const clarificationRule = request.shortPrompt
    ? "The learner supplied an ultra-short request. Do not turn it into a generic lesson or invent what the shorthand means. Ask one concise clarification question, unless the supplied context makes the intended concept unambiguous."
    : "The learner supplied a substantive request. Teach it directly and specifically.";

  return `${request.prompt}\n\n${context}\n\nTeaching contract:\n- Preserve the learner's request exactly as the starting point.\n- ${ambiguityRule}\n- ${clarificationRule}\n- Use education level and exam/curriculum context when supplied; never invent missing curriculum details.\n- Follow the resolved learning intent and teaching strategy.\n- Teach the requested concept rather than generating a generic lesson about the subject.\n- Prefer concrete definitions, correct notation, worked reasoning, checks for understanding, misconceptions, exam application, and targeted practice over motivational filler.`;
}

export type { LearningIntentResult };
