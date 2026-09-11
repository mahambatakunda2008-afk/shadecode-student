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
  worked_example: "example",
  "worked-example": "example",
  "worked example": "example",
  example_solution: "example",
  application_task: "application",
  "application-task": "application",
  real_world_application: "application",
  "real-world-application": "application",
  exam_transfer: "exam",
  "exam-transfer": "exam",
  exam_application: "exam",
  key_takeaways: "summary",
  "key-takeaways": "summary",
  takeaways: "summary",
  check: "checkpoint",
  think: "checkpoint",
  thinking_checkpoint: "checkpoint",
  common_mistake: "mistake",
  "common-mistakes": "mistake",
  trap: "misconception",
  prior_knowledge: "prior",
  prerequisite: "prior",
  method: "formula",
  steps: "formula",
  questions: "practice",
  practice_questions: "practice",
  "practice-questions": "practice",
};

export function normalizeLessonBlockType(value: string) {
  const key = value.trim().toLowerCase().replace(/\s+/g, " ");
  return aliases[key] ?? key;
}

export function lessonQualityFailures(lesson: { blocks: LessonQualityBlock[] }, request: LessonQualityRequest) {
  const types = new Set(lesson.blocks.map(block => normalizeLessonBlockType(block.type)));
  const contents = lesson.blocks.map(block => block.content.trim().toLowerCase());
  const text = contents.join(" ");
  const failures: string[] = [];
  const has = (...names: string[]) => names.some(name => types.has(name));

  if (["as an ai", "generic overview", "placeholder", "lesson will cover", "let's dive into"].some(p => text.includes(p))) failures.push("generic-language");
  if (new Set(contents).size < Math.min(lesson.blocks.length, 8)) failures.push("repetition");

  // Universal backbone. Every session must teach, demonstrate, test thinking, and close the loop.
  if (!has("objective")) failures.push("objective");
  if (!has("concept", "definition")) failures.push("concept");
  if (!has("example")) failures.push("example");
  if (!has("checkpoint")) failures.push("checkpoint");
  if (!has("summary")) failures.push("summary");

  // Intent-specific gates. A short teaching request should not fail because it lacks an exam section.
  if (request.intent === "teach") {
    if (!has("application") && request.requestedParts.includes("application")) failures.push("application");
  } else if (request.intent === "remedial") {
    if (!has("misconception", "mistake")) failures.push("remedial-correction");
  } else if (request.intent === "revision") {
    if (!has("exam", "practice")) failures.push("revision-transfer");
  } else if (request.intent === "practice") {
    const practiceCount = lesson.blocks.filter(block => normalizeLessonBlockType(block.type) === "practice" || /practice|question/i.test(`${block.title ?? ""} ${block.content}`)).length;
    if (practiceCount < 2) failures.push("practice-depth");
  } else if (request.intent === "comparison" && !has("comparison")) {
    failures.push("comparison");
  }

  // Explicitly requested components are hard requirements.
  for (const part of request.requestedParts) {
    if (part === "proof/derivation" && !/prove|proof|derive|derivation|show that|justify/i.test(text)) failures.push("requested-proof");
    if (part === "worked examples" && !has("example")) failures.push("requested-examples");
    if (part === "exam transfer" && !has("exam", "practice")) failures.push("requested-exam-transfer");
    if (part === "application" && !has("application")) failures.push("requested-application");
    if (part === "code or algorithm reasoning" && !/code|algorithm|trace|debug|program/i.test(text)) failures.push("requested-code-reasoning");
  }

  const quantitative = /math|mathematics|physics|chemistry|economics/i.test(request.subject);
  const formulaTopic = /formula|equation|calculate|calculation|law|identity|theorem|gradient|rate|force|energy|momentum|probability|trigonometry|algebra|differentiat|integrat/i.test(`${request.topic} ${request.prompt}`);
  if (quantitative && formulaTopic && request.intent !== "comparison" && !has("formula")) failures.push("formula");

  return { failures: [...new Set(failures)], types: [...types] };
}
