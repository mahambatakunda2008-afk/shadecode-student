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

/**
 * Resolve a complete request while preserving the learner's exact prompt.
 * Explicit context always wins. A short prompt must never be expanded into
 * an invented lesson title or subject.
 */
export function resolveLessonRequest(input: LessonRequest) {
  const prompt = clean(input.prompt, 500);
  const explicitSubject = clean(input.subject, 100);
  const inferredSubject = explicitSubject ? "" : inferSubject(prompt);
  const subject = explicitSubject || inferredSubject;
  const topic = clean(input.topic, 500) || prompt;
  const difficulty = input.difficulty === "easy" || input.difficulty === "hard" ? input.difficulty : "medium";

  return {
    prompt,
    subject,
    topic,
    level: clean(input.level, 80),
    goal: clean(input.goal, 300),
    examBoard: clean(input.examBoard, 100),
    difficulty,
    ambiguousSubject: !explicitSubject && !inferredSubject,
    shortPrompt: prompt.length > 0 && prompt.length <= 3,
  };
}

export function buildResolvedLessonPrompt(request: ReturnType<typeof resolveLessonRequest>) {
  const context = [
    request.subject && `Subject: ${request.subject}`,
    request.level && `Education level: ${request.level}`,
    request.examBoard && `Exam/curriculum: ${request.examBoard}`,
    request.goal && `Learning goal: ${request.goal}`,
    `Difficulty: ${request.difficulty}`,
  ].filter(Boolean).join("\n");

  const ambiguityRule = request.ambiguousSubject
    ? "The subject is unresolved. Do not guess it. Ask for the subject before generating substantive subject-specific teaching."
    : "The subject is resolved by learner context. Do not replace it with an inferred subject from the prompt.";

  return `${request.prompt}\n\n${context}\n\nTeaching contract:\n- Preserve the learner's request exactly as the starting point, including very short prompts such as one-letter or shorthand inputs.\n- ${ambiguityRule}\n- Use education level and exam/curriculum context when supplied; never invent missing curriculum details.\n- Teach the requested concept rather than generating a generic lesson about the subject.\n- Prefer concrete definitions, correct notation, worked reasoning, checks for understanding, misconceptions, exam application, and targeted practice over motivational filler.`;
}
