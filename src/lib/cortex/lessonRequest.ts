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
  computers: "Computer Science",
  "computer science": "Computer Science",
  cs: "Computer Science",
  programming: "Computer Science",
};

const INTENT_PATTERNS: Array<[LessonIntent, RegExp]> = [
  ["comparison", /\b(compare|comparison|difference between|distinguish between|versus|vs\.?|contrast|similarities|differences)\b/i],
  ["practice", /\b(practice|questions|question practice|past paper|exam questions|test me|quiz me|drill|worksheet|problems?)\b/i],
  ["revision", /\b(revise|revision|revision of|recap|review|summari[sz]e|refresh|quick review|last minute)\b/i],
  ["remedial", /\b(don'?t understand|do not understand|confused|struggling|stuck|help me understand|explain again|weak at|keep getting wrong|why can'?t i|make it simpler|from the basics)\b/i],
];

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function inferSubject(prompt: string) {
  const lower = prompt.toLowerCase();
  const aliases = Object.keys(SUBJECT_ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`, "i").test(lower)) return SUBJECT_ALIASES[alias];
  }
  return "";
}

function classifyIntent(prompt: string, goal = ""): LessonIntent {
  const text = `${prompt} ${goal}`.toLowerCase();
  for (const [intent, pattern] of INTENT_PATTERNS) if (pattern.test(text)) return intent;
  return "teach";
}

function extractTopic(prompt: string, subject: string) {
  let topic = prompt.trim();
  topic = topic.replace(/^\s*(please\s+)?(teach|explain|show|walk me through|help me learn|help me understand)\s+(me\s+)?/i, "");
  topic = topic.replace(/^\s*(revise|revision|review|recap|summarise|summarize)\s+(me\s+)?/i, "");
  topic = topic.replace(/^\s*(give me|do)\s+(exam\s+)?(practice|questions?|problems?)\s+(on|about)\s+/i, "");
  topic = topic.replace(/^\s*(compare|contrast|differentiate)\s+/i, "");
  if (subject) topic = topic.replace(new RegExp(`^${subject.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*[:,-]?\\s*`, "i"), "");
  return topic.trim().replace(/[?.!]+$/, "").trim() || prompt;
}

function inferRequestShape(prompt: string, goal: string, intent: LessonIntent) {
  const text = `${prompt} ${goal}`.toLowerCase();
  const depth = /\b(from (the )?basics|step[- ]by[- ]step|in depth|deep dive|thorough|comprehensive|detailed|properly|master|mastery)\b/.test(text)
    ? "deep"
    : /\b(quick|brief|short|summary|fast|recap)\b/.test(text)
      ? "quick"
      : "standard";
  const wantsProof = /\b(prove|proof|derive|derivation|show that|justify)\b/.test(text);
  const wantsExamples = /\b(example|examples|worked|demonstrate|demonstration)\b/.test(text);
  const wantsExamTransfer = /\b(exam|past paper|mark scheme|marks?|cambridge|zimsec|edexcel|gcse|igcse|a[- ]?level|o[- ]?level)\b/.test(text);
  const wantsPractical = /\b(real world|real-world|application|practical|project|scenario|use case)\b/.test(text);
  const wantsCode = /\b(code|program|programming|algorithm|trace|debug|implement)\b/.test(text);
  const requestedParts = [
    wantsProof && "proof/derivation",
    wantsExamples && "worked examples",
    wantsExamTransfer && "exam transfer",
    wantsPractical && "application",
    wantsCode && "code or algorithm reasoning",
  ].filter(Boolean) as string[];
  if (intent === "practice" && !requestedParts.includes("worked examples")) requestedParts.unshift("worked examples");
  return { depth, requestedParts };
}

export function resolveLessonRequest(input: LessonRequest) {
  const prompt = clean(input.prompt, 800);
  const explicitSubject = clean(input.subject, 100);
  const subject = explicitSubject || inferSubject(prompt);
  const goal = clean(input.goal, 400);
  const topic = clean(input.topic, 700) || extractTopic(prompt, subject);
  const intent = classifyIntent(prompt, goal);
  const shape = inferRequestShape(prompt, goal, intent);

  return {
    prompt,
    subject,
    topic,
    level: clean(input.level, 80),
    goal,
    examBoard: clean(input.examBoard, 100),
    difficulty: input.difficulty ?? "medium",
    intent,
    depth: shape.depth,
    requestedParts: shape.requestedParts,
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
    `Requested depth: ${request.depth}`,
    request.requestedParts.length > 0 && `Requested components: ${request.requestedParts.join(", ")}`,
  ].filter(Boolean).join("\n");

  const intentContract = {
    teach: "Teach one usable capability. Include a worked example, a thinking checkpoint, and an application. Include exam transfer when the learner is studying for an exam or the curriculum context makes it useful.",
    remedial: "Diagnose the likely misconception, rebuild the mental model from the needed prerequisite, then use a worked example and correction. Keep the lesson focused on fixing the learner's actual gap.",
    revision: "Prioritise high-yield recall plus discrimination between similar ideas, then transfer the knowledge into exam-style practice. Avoid reteaching an entire textbook chapter.",
    practice: "Teach the method briefly, demonstrate one worked example, then give at least three progressively harder questions. Questions must test transfer rather than repeat the same numbers.",
    comparison: "Define both sides precisely, compare them explicitly, expose the most important similarities and differences, then test the distinction with an application or checkpoint.",
  }[request.intent];

  const requestedContract = request.requestedParts.length > 0
    ? `Explicit learner requirements are mandatory and must not be silently dropped: ${request.requestedParts.join(", ")}.`
    : "No extra learner components were explicitly requested. Do not add elaborate sections merely to make the lesson look longer.";

  const presentationContract = `Presentation contract: this is a learning interface, not an essay. Never return wall-of-text paragraphs. Keep every block scannable and visually structured. Use short lines and explicit labels instead of prose paragraphs. Put each distinct idea, objective, definition, formula, step, question, warning or takeaway on its own line. Prefer bullet lines beginning with "- " for objectives, definitions, key ideas, mistakes and summaries. Use numbered lines such as "1. " for procedures, proofs and practice questions. For worked examples use labelled lines such as "Given:", "Method:", "Step 1:", "Step 2:", "Answer:". For proofs use one logical transformation per numbered line. For formulas, put each formula on its own line and explain symbols on separate lines. For checkpoints use "Question:" and "Think:" or "Answer:" on separate lines. For exam transfer use "Question:", "Approach:", "Examiner looks for:" on separate lines. Keep individual lines concise, normally one sentence or less. Do not join multiple labelled items into a single paragraph. Do not use markdown tables. Do not wrap the whole lesson in conversational filler.`;

  return `${context}\n\nLearner's exact request: ${request.prompt}\n\nTeaching contract: ${intentContract}\n${requestedContract}\n\n${presentationContract}\n\nInterpretation rules: preserve the learner's requested scope and components. A short topic name is a valid request, not an instruction to ask for more detail. For a broad or multi-part request, decompose it into a coherent learning path and cover the requested parts in dependency order. Do not silently drop a requested component. Use application, exam-transfer, formula and prerequisite sections when they are relevant to the intent, topic, curriculum or learner request, rather than forcing the same template onto every lesson. If the subject is unresolved, teach only subject-neutral material or ask for clarification when subject knowledge is genuinely required; never invent a board, subject, qualification, or syllabus.`;
}
