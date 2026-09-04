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

/** Resolve a complete request without guessing from one-letter subject shortcuts. */
export function resolveLessonRequest(input: LessonRequest) {
  const prompt = clean(input.prompt, 500);
  const explicitSubject = clean(input.subject, 100);
  const subject = explicitSubject || inferSubject(prompt);
  const topic = clean(input.topic, 500) || prompt;

  return {
    prompt,
    subject,
    topic,
    level: clean(input.level, 80),
    goal: clean(input.goal, 300),
    examBoard: clean(input.examBoard, 100),
    difficulty: input.difficulty ?? "medium",
    ambiguousSubject: !explicitSubject && !subject,
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

  return `${request.prompt}\n\n${context}\n\nTeach the learner's actual request. Do not reinterpret a short or ambiguous prompt as a specific subject or topic. If the subject is unresolved, ask for clarification rather than inventing one.`;
}
