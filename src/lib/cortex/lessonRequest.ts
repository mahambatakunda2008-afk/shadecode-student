export type LessonIntent = "teach" | "remedial" | "revision" | "practice" | "comparison";

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
  mathematics: "Mathematics",
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

function classifyIntent(prompt: string, goal = ""): LessonIntent {
  const text = `${prompt} ${goal}`.toLowerCase();
  if (/\b(compare|comparison|difference between|distinguish between|versus|vs\.?|contrast)\b/.test(text)) return "comparison";
  if (/\b(practice|questions|question practice|past paper|exam questions|test me|quiz me|drill)\b/.test(text)) return "practice";
  if (/\b(revise|revision|revision of|recap|review|summari[sz]e|refresh)\b/.test(text)) return "revision";
  if (/\b(don'?t understand|do not understand|confused|struggling|stuck|help me understand|explain again|weak at|keep getting wrong|why can'?t i)\b/.test(text)) return "remedial";
  return "teach";
}

function extractTopic(prompt: string, subject: string) {
  let topic = prompt.trim();
  topic = topic.replace(/^\s*(please\s+)?(teach|explain|show|help me learn|help me understand)\s+(me\s+)?/i, "");
  topic = topic.replace(/^\s*(revise|revision|review|recap)\s+(me\s+)?/i, "");
  topic = topic.replace(/^\s*(give me|do)\s+(exam\s+)?(practice|questions?)\s+(on|about)\s+/i, "");
  topic = topic.replace(/^\s*(compare|contrast)\s+/i, "");
  if (subject) topic = topic.replace(new RegExp(`^${subject.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*[:,-]?\\s*`, "i"), "");
  return topic.trim().replace(/[?.!]+$/, "").trim() || prompt;
}

/** Resolve intent and topic deterministically before generation. Never invent a missing subject. */
export function resolveLessonRequest(input: LessonRequest) {
  const prompt = clean(input.prompt, 500);
  const explicitSubject = clean(input.subject, 100);
  const subject = explicitSubject || inferSubject(prompt);
  const goal = clean(input.goal, 300);
  const topic = clean(input.topic, 500) || extractTopic(prompt, subject);
  const intent = classifyIntent(prompt, goal);

  return {
    prompt,
    subject,
    topic,
    level: clean(input.level, 80),
    goal,
    examBoard: clean(input.examBoard, 100),
    difficulty: input.difficulty ?? "medium",
    intent,
    ambiguousSubject: !explicitSubject && !subject,
  };
}

export function buildResolvedLessonPrompt(request: ReturnType<typeof resolveLessonRequest>) {
  const context = [
    `Intent: ${request.intent}`,
    `Requested topic: ${request.topic}`,
    request.subject && `Subject: ${request.subject}`,
    request.level && `Education level: ${request.level}`,
    request.examBoard && `Exam/curriculum: ${request.examBoard}`,
    request.goal && `Learning goal: ${request.goal}`,
    `Difficulty: ${request.difficulty}`,
  ].filter(Boolean).join("\n");

  return `${context}\n\nLearner's exact request: ${request.prompt}\n\nTeach only the requested topic. Do not reinterpret a short or ambiguous prompt as a specific topic. If the subject is unresolved, ask for clarification rather than inventing one.`;
}
