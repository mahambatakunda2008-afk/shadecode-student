export type LessonQualityRequest = {
  intent: "teach" | "remedial" | "revision" | "practice" | "comparison";
  subject: string;
  topic: string;
  prompt: string;
  requestedParts: string[];
};

export type LessonQualityBlock = {
  type: string;
  title?: string;
  content: string;
};

const aliases: Record<string, string> = {
  objective: "objective", learning_objective: "objective", "learning objective": "objective", outcome: "objective", outcomes: "objective", goal: "objective", goals: "objective",
  prior_knowledge: "prior", "prior knowledge": "prior", prerequisite: "prior", prerequisites: "prior", background: "prior",
  concept: "concept", explanation: "concept", teaching: "concept", teach: "concept", core_concept: "concept", "core concept": "concept",
  definition: "definition", definitions: "definition", key_definition: "definition", "key definition": "definition",
  formula: "formula", formulas: "formula", method: "formula", methods: "formula", steps: "formula", procedure: "formula", approach: "formula", identity: "formula", identities: "formula", "key identities": "formula",
  worked_example: "example", "worked-example": "example", "worked example": "example", example_solution: "example", "example solution": "example", solved_example: "example", "solved example": "example", demonstration: "example", demo: "example",
  check: "checkpoint", think: "checkpoint", thinking_checkpoint: "checkpoint", "thinking checkpoint": "checkpoint", reflection: "checkpoint", self_check: "checkpoint", "self check": "checkpoint",
  application_task: "application", "application-task": "application", "application task": "application", real_world_application: "application", "real-world-application": "application", "real world application": "application", real_world: "application", "real world": "application", transfer: "application",
  exam_transfer: "exam", "exam-transfer": "exam", "exam transfer": "exam", exam_application: "exam", "exam application": "exam", exam_practice: "exam", past_paper: "exam", "past paper": "exam",
  key_takeaways: "summary", "key-takeaways": "summary", "key takeaways": "summary", takeaways: "summary", takeaway: "summary", conclusion: "summary", recap: "summary", review: "summary",
  common_mistake: "mistake", "common-mistakes": "mistake", "common mistake": "mistake", common_mistakes: "mistake", trap: "misconception", misconception: "misconception", misconceptions: "misconception", error: "mistake", errors: "mistake",
  questions: "practice", question: "practice", practice_questions: "practice", "practice-questions": "practice", "practice questions": "practice", exercises: "practice", exercise: "practice", drill: "practice",
  comparison: "comparison", compare: "comparison", differences: "comparison",
};

export function normalizeLessonBlockType(value: string) {
  const key = value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  return aliases[key] ?? key;
}

export function lessonQualityFailures(lesson: { blocks: LessonQualityBlock[] }, request: LessonQualityRequest) {
  const normalized = lesson.blocks.map(block => ({
    ...block,
    normalizedType: normalizeLessonBlockType(block.type),
    searchable: `${block.title ?? ""} ${block.content}`.trim().toLowerCase(),
  }));
  const types = new Set(normalized.map(block => block.normalizedType));
  const contents = normalized.map(block => block.content.trim().toLowerCase());
  const text = contents.join(" ");
  const searchableText = normalized.map(block => block.searchable).join(" ");
  const failures: string[] = [];
  const has = (...names: string[]) => names.some(name => types.has(name));

  if (["as an ai", "generic overview", "placeholder", "lesson will cover", "let's dive into"].some(p => text.includes(p))) failures.push("generic-language");
  if (new Set(contents).size < Math.min(lesson.blocks.length, 8)) failures.push("repetition");

  // Presentation is part of lesson quality. A technically correct lesson is
  // still a poor learning experience if it arrives as dense prose. The UI is
  // intentionally optimized for short, scannable learning units.
  const wallOfText = normalized.some(block => {
    const content = block.content.trim();
    const lineCount = content.split(/\n+/).map(line => line.trim()).filter(Boolean).length;
    const sentenceCount = (content.match(/[.!?](?:\s|$)/g) ?? []).length;
    const avgSentenceLength = sentenceCount ? content.length / sentenceCount : content.length;
    return content.length > 700 && lineCount < 3 || content.length > 1100 && lineCount < 5 || avgSentenceLength > 260;
  });
  if (wallOfText) failures.push("wall-of-text");

  const structuredTypes = new Set(["objective", "prior", "definition", "formula", "example", "checkpoint", "exam", "mistake", "misconception", "practice", "summary"]);
  const structuredBlocks = normalized.filter(block => structuredTypes.has(block.normalizedType));
  const lineStructuredCount = structuredBlocks.filter(block => {
    const lines = block.content.split(/\n+/).map(line => line.trim()).filter(Boolean);
    return lines.length >= 2 || /(^|\n)([-•]|\d+[.)]|Given:|Method:|Step\s+\d+:|Question:|Answer:|Approach:|Examiner looks for:)/i.test(block.content);
  }).length;
  if (structuredBlocks.length >= 4 && lineStructuredCount < Math.min(3, structuredBlocks.length)) failures.push("weak-structure");

  if (!has("objective") && !/learning objective|by the end|you will be able to|student will be able to/i.test(searchableText)) failures.push("objective");
  if (!has("concept", "definition") && !/explains?|means|refers to|concept|understand|why it works/i.test(searchableText)) failures.push("concept");
  if (!has("example") && !/worked example|for example|consider this|let's work through|step 1/i.test(searchableText)) failures.push("example");
  if (!has("checkpoint") && !/pause and think|stop and think|check yourself|your turn|before reading on/i.test(searchableText)) failures.push("checkpoint");
  if (!has("summary") && !/key takeaway|in summary|to recap|remember that|you should now be able to/i.test(searchableText)) failures.push("summary");

  if (request.intent === "teach") {
    if (!has("application") && request.requestedParts.includes("application")) failures.push("application");
  } else if (request.intent === "remedial") {
    if (!has("misconception", "mistake") && !/common mistake|misconception|often confuse|students? tend to/i.test(searchableText)) failures.push("remedial-correction");
  } else if (request.intent === "revision") {
    if (!has("exam", "practice") && !/exam|past paper|practice question|test yourself/i.test(searchableText)) failures.push("revision-transfer");
  } else if (request.intent === "practice") {
    const practiceCount = normalized.filter(block => block.normalizedType === "practice" || /practice|question|exercise/i.test(block.searchable)).length;
    if (practiceCount < 2) failures.push("practice-depth");
  } else if (request.intent === "comparison" && !has("comparison") && !/similarit|differ|whereas|while|both|compared with/i.test(searchableText)) {
    failures.push("comparison");
  }

  for (const part of request.requestedParts) {
    if (part === "proof/derivation" && !/prove|proof|derive|derivation|show that|justify/i.test(text)) failures.push("requested-proof");
    if (part === "worked examples" && !has("example") && !/worked example|for example|consider this/i.test(searchableText)) failures.push("requested-examples");
    if (part === "exam transfer" && !has("exam", "practice") && !/exam|past paper|practice question/i.test(searchableText)) failures.push("requested-exam-transfer");
    if (part === "application" && !has("application") && !/apply|real[- ]world|scenario|use this|task:/i.test(searchableText)) failures.push("requested-application");
    if (part === "code or algorithm reasoning" && !/code|algorithm|trace|debug|program/i.test(text)) failures.push("requested-code-reasoning");
  }

  const quantitative = /math|mathematics|physics|chemistry|economics/i.test(request.subject);
  const formulaTopic = /formula|equation|calculate|calculation|law|identity|theorem|gradient|rate|force|energy|momentum|probability|trigonometry|algebra|differentiat|integrat/i.test(`${request.topic} ${request.prompt}`);
  if (quantitative && formulaTopic && request.intent !== "comparison" && !has("formula") && !/formula|equation|relationship|method|calculation|substitut|identity/i.test(searchableText)) failures.push("formula");

  return { failures: [...new Set(failures)], types: [...types] };
}
