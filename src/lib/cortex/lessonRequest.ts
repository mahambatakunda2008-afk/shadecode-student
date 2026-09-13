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
  ["practice", /\b(practice|questions?|question practice|past paper|exam questions|test me|quiz me|drill|worksheet|problems?|exercises?)\b/i],
  ["revision", /\b(revise|revision|revision of|recap|review|summari[sz]e|refresh|quick review|last minute|go over)\b/i],
  ["remedial", /\b(don'?t understand|do not understand|confused|struggling|stuck|help me understand|explain again|weak at|keep getting wrong|why can'?t i|make it simpler|from the basics|teach me from scratch)\b/i],
];

const COMMAND_PATTERNS = /^(?:please\s+)?(?:teach|explain|show|walk me through|help me learn|help me understand|help me with|go through|cover|learn)\b/i;

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

function stripCommand(text: string) {
  let value = text.trim();
  value = value.replace(/^\s*(please\s+)?(?:teach|explain|show|walk me through|help me learn|help me understand|help me with|go through|cover|learn)\s+(?:me\s+)?/i, "");
  value = value.replace(/^\s*(?:revise|revision|review|recap|summarise|summarize)\s+(?:me\s+)?/i, "");
  value = value.replace(/^\s*(?:give me|do)\s+(?:exam\s+)?(?:practice|questions?|problems?|exercises?)\s+(?:on|about)\s+/i, "");
  value = value.replace(/^\s*(?:compare|contrast|differentiate)\s+/i, "");
  return value.trim();
}

function extractTopic(prompt: string, subject: string) {
  let topic = stripCommand(prompt);
  if (subject) topic = topic.replace(new RegExp(`^${subject.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*[:,-]?\\s*`, "i"), "");
  return topic.trim().replace(/[?.!]+$/, "").trim() || prompt.trim();
}

function inferRequestShape(prompt: string, goal: string, intent: LessonIntent) {
  const text = `${prompt} ${goal}`.toLowerCase();
  const depth = /\b(from (the )?basics|step[- ]by[- ]step|in depth|deep dive|thorough|comprehensive|detailed|properly|master|mastery)\b/.test(text)
    ? "deep"
    : /\b(quick|brief|short|summary|fast|recap)\b/.test(text)
      ? "quick"
      : "standard";
  const requestedParts = [
    /\b(prove|proof|derive|derivation|show that|justify)\b/.test(text) && "proof/derivation",
    /\b(example|examples|worked|demonstrate|demonstration)\b/.test(text) && "worked examples",
    /\b(exam|past paper|mark scheme|marks?|cambridge|zimsec|edexcel|gcse|igcse|a[- ]?level|o[- ]?level)\b/.test(text) && "exam transfer",
    /\b(real world|real-world|application|practical|project|scenario|use case)\b/.test(text) && "application",
    /\b(code|program|programming|algorithm|trace|debug|implement)\b/.test(text) && "code or algorithm reasoning",
  ].filter(Boolean) as string[];
  if (intent === "practice" && !requestedParts.includes("worked examples")) requestedParts.unshift("worked examples");
  return { depth, requestedParts };
}

export function resolveLessonRequest(input: LessonRequest) {
  const prompt = clean(input.prompt, 800);
  const explicitSubject = clean(input.subject, 100);
  const subject = explicitSubject || inferSubject(prompt);
  const goal = clean(input.goal, 400);
  const explicitTopic = clean(input.topic, 700);
  const topic = explicitTopic || extractTopic(prompt, subject);
  const intent = classifyIntent(prompt, goal);
  const shape = inferRequestShape(prompt, goal, intent);
  const commandLike = COMMAND_PATTERNS.test(prompt);

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
    commandLike,
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
    request.requestedParts.length > 0 && `Explicitly requested components: ${request.requestedParts.join(", ")}`,
  ].filter(Boolean).join("\n");

  const intentContract = {
    teach: "The learner asked to learn the topic. Build understanding in a natural dependency order, then verify it. Do not turn a simple teach request into a survey of every technique in the subject. Cover the requested topic first and only introduce related techniques when they are necessary to understand or use that topic.",
    remedial: "The learner is signalling a learning gap. Start by identifying the likely point of confusion, rebuild only the prerequisite knowledge needed, then guide the learner through corrected reasoning. Do not overwhelm them with a full chapter.",
    revision: "The learner wants revision. Compress the topic into high-yield knowledge, distinctions, formulas or procedures, then test recall and transfer. Do not reteach unrelated material.",
    practice: "The learner wants questions. Give only the minimum method teaching needed to make the questions solvable, one worked example, then progressively harder questions. Do not pad the session with unrelated theory.",
    comparison: "The learner wants a distinction. Define the compared concepts, show the meaningful similarities and differences, then test whether the learner can choose or apply the correct one. Do not drift into an unrelated chapter.",
  }[request.intent];

  const requestedContract = request.requestedParts.length > 0
    ? `These explicitly requested components are mandatory: ${request.requestedParts.join(", ")}. They must be integrated into the requested topic, not bolted on as filler.`
    : "No extra components were requested. Do not manufacture proof, application, exam-transfer, real-world examples, or unrelated sections merely to reach a block count.";

  const presentationContract = `Presentation contract: this is an interactive learning session, not an essay. Organize information into small, purposeful learning units. Never produce wall-of-text paragraphs. Use short lines and explicit labels. Put each distinct idea, definition, formula, step, question, warning or takeaway on its own line. Use '- ' for compact lists and numbered lines for ordered reasoning. Worked examples use separate Given:, Method:, Step 1:, Step 2:, Answer: lines. Proofs use one transformation per numbered line. Formulas go on their own lines with symbols explained separately. Checkpoints use Question: and Think: on separate lines and should not reveal the answer in the same checkpoint block. Exam transfer, when actually relevant, uses Question:, Approach:, Examiner looks for:. Keep lines concise. No markdown tables. No filler headings such as Demanded worked example, Distribution myth, Verification habit, or other labels that sound like internal template instructions. Headings should describe the actual learning content.`;

  return `${context}\n\nLearner's exact request: ${request.prompt}\n\nIntent interpretation: ${intentContract}\n${requestedContract}\n\n${presentationContract}\n\nScope and reasoning rules:\n- Treat the learner's exact request as the primary source of intent. Do not let a generic goal such as "master ..." override a more specific command such as "teach me ...".\n- Normalize obvious spelling errors in the learner's wording internally while preserving the intended topic. Do not teach the misspelled token as if it were a different concept.\n- Distinguish the learning action from the topic. "Teach me integration" means teach integration. "Give me integration questions" means practice integration. "Compare integration and differentiation" means comparison.\n- Keep the lesson centered on the requested topic. Related concepts are allowed only when they are prerequisites, necessary distinctions, or direct applications of the requested topic.\n- A broad topic may be decomposed into a sensible sequence, but do not silently expand it into every adjacent chapter.\n- Do not force a fixed twelve-section template. The number and type of blocks should follow the learner's intent and topic.\n- If an application, exam transfer, proof, derivation, formula, or prerequisite is not relevant to the requested topic, leave it out.\n- If the learner did not ask for an exam-focused lesson, do not invent exam claims or arbitrary exam questions. Curriculum context may inform accuracy, but it does not change the learner's requested intent.\n- Every example and numerical result must have enough information to make the result meaningful. Never output an unexplained answer such as a bare number.\n- Every checkpoint must actually test the learner and should not immediately disclose its answer.\n- Do not invent official syllabus requirements, past-paper provenance, mark allocations, examiner expectations, or board-specific claims.\n- If verified curriculum context is supplied, use its objectives to constrain scope. Do not merely paste objectives into the lesson.`;
}
