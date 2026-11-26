export type LessonQualityRequest = {
  intent: "teach" | "remedial" | "revision" | "practice" | "comparison";
  subject: string;
  topic: string;
  prompt: string;
  requestedParts: string[];
  level?: string;
  goal?: string;
  examBoard?: string;
  difficulty?: "easy" | "medium" | "hard";
  depth?: "quick" | "standard" | "deep";
  broadTopic?: boolean;
  commandLike?: boolean;
  ambiguousSubject?: boolean;
};

export type LessonQualityBlock = { type: string; title?: string; content: string };

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
  map: "map", roadmap: "map", overview_map: "map", "overview map": "map",
  structure: "structure", classification: "structure", framework: "structure",
  mechanism: "mechanism", process: "mechanism", reasoning: "mechanism",
  synthesis: "synthesis", integration: "synthesis", connection: "synthesis", connections: "synthesis",
  curiosity: "curiosity", exploration: "curiosity", "further exploration": "curiosity",
  next: "next", continuation: "next", "next steps": "next",
};

/**
 * Server persistence contract: a lesson needs an objective, concept, example, checkpoint, exam practice,
 * a mistake/misconception and a summary. The lesson quality gate already treats "practice" as exam
 * practice and "misconception" as a mistake block, and generated sections use those names, so the
 * contract accepts them too instead of rejecting otherwise complete lessons with a 422.
 */
export function hasRequiredLessonStructure(types: ReadonlySet<string>): boolean {
  const need = (...accepted: string[]) => accepted.some(type => types.has(type));
  return need("objective") && need("concept") && need("example") && need("checkpoint")
    && need("exam", "practice") && need("mistake", "misconception") && need("summary");
}

/** The lesson diagram a topic must include (the id is a render key for a built-in diagram), or null. */
export function requiredDiagramFor(request: Pick<LessonQualityRequest, "topic" | "subject">): string | null {
  const topicLower = request.topic.toLowerCase();
  const subjectLower = request.subject.toLowerCase();
  return /coordinate geometry|gradient|straight.line equation/.test(topicLower) ? "coordinate-plane"
    : /\bwaves?\b|amplitude|wavelength/.test(topicLower) ? "wave-shape"
    : /newton.s laws|newton.s third law|action.reaction/.test(topicLower) ? "force-pairs"
    : /numerical solution|bisection|root.bracketing/.test(topicLower) ? "root-bracket"
    : /trigonometric identities|trigonometry/.test(topicLower) ? "unit-circle"
    : /binary number systems|binary conversion/.test(topicLower) ? "binary-place-values"
    : /biology/.test(subjectLower) && /cell|organelles|plant cell|animal cell/.test(topicLower) ? "cell-structure"
    : /chemistry/.test(subjectLower) && /particle theory|states of matter|particle model|diffusion/.test(topicLower) ? "particle-model"
    : /computer science/.test(subjectLower) && /algorithm|flowchart|selection|iteration|pseudocode/.test(topicLower) ? "flowchart"
    : /physics/.test(subjectLower) && /series circuit|electric circuit|circuit diagrams|ohm.s law|resistance in series|current electricity/.test(topicLower) ? "series-circuit" : null;
}

/** Adds the topic's required built-in diagram when the model did not emit it, placing it after the first concepts. */
export function ensureRequiredDiagram<T extends { type?: unknown; content?: unknown }>(
  blocks: T[],
  request: Pick<LessonQualityRequest, "topic" | "subject">,
): Array<T | { type: string; title: string; content: string }> {
  const required = requiredDiagramFor(request);
  if (!required) return blocks;
  const has = blocks.some(block => normalizeLessonBlockType(String(block.type)) === "diagram" && String(block.content).trim() === required);
  if (has) return blocks;
  const withoutBadDiagrams = blocks.filter(block => normalizeLessonBlockType(String(block.type)) !== "diagram");
  const at = Math.min(3, withoutBadDiagrams.length);
  return [...withoutBadDiagrams.slice(0, at), { type: "diagram", title: "Diagram", content: required }, ...withoutBadDiagrams.slice(at)];
}

export const isQuantitativeSubject = (subject: string) => /math|mathematics|chemistry|physics|economics/i.test(subject);
export const isFormulaTopic = (topic: string, prompt: string) => /formula|equation|calculate|calculation|law|identity|theorem|gradient|rate|force|energy|momentum|probability|trigonometry|algebra|differentiat|integrat/i.test(`${topic} ${prompt}`);
/** True when the whole-lesson gate will demand a formula, so the mechanism section must supply one. */
export const needsFormulaBlock = (subject: string, topic: string, prompt: string) => isQuantitativeSubject(subject) && isFormulaTopic(topic, prompt);

/**
 * Block types each section of a multi-section lesson must contain, so a deep lesson always carries the
 * big-picture / structure / mechanism / synthesis / go-deeper stages the Learn page labels by type.
 * The model ignored a soft placement hint (production 2026-11-22), so this is checked per section.
 */
export function requiredSectionTypes(index: number, count: number, opts: { formula?: boolean } = {}): string[] {
  if (count < 2) return [];
  const required: string[] = [];
  if (index === 0) required.push("objective", "map");
  // Core sections each carry a worked example and a check, so the whole lesson reaches the deep-lesson
  // minimums (3 examples/applications, 3 checkpoints) however many sections the plan has.
  if (index >= 1 && index <= count - 2) required.push("example", "checkpoint");
  if (index === 1) required.push("structure");
  if (count > 2 && index === Math.min(2, count - 2)) required.push("mechanism", ...(opts.formula ? ["formula"] : []));
  if (count > 2 && index === count - 2) required.push("synthesis");
  if (index === count - 1) required.push("curiosity", "practice", "mistake", "summary", "application", "checkpoint");
  return required;
}

export function missingSectionTypes(blockTypes: string[], index: number, count: number, opts: { formula?: boolean } = {}): string[] {
  const present = new Set(blockTypes.map((type) => normalizeLessonBlockType(type)));
  return requiredSectionTypes(index, count, opts).filter((type) => !present.has(type));
}

/** The section prompt asks for 3-5 blocks; fewer than 3 in a multi-section lesson is a thin section. */
export const MIN_SECTION_BLOCKS = 3;
export function isSectionTooThin(blockCount: number, sectionCount: number): boolean {
  return sectionCount > 1 && blockCount < MIN_SECTION_BLOCKS;
}

/**
 * Splits over-long single-paragraph block content into short paragraphs at sentence boundaries.
 * Models often return one dense paragraph for a deep explanation; that is a formatting problem,
 * not a reason to discard the section (production 2026-11-21: three wall-of-text rejections in a
 * row exhausted a section's repair attempts). Content that is already structured is untouched.
 */
export function breakUpLongParagraphs<T extends { content: string }>(blocks: T[]): T[] {
  return blocks.map((block) => {
    const content = block.content.trim();
    const lineCount = content.split(/\n+/).map((line) => line.trim()).filter(Boolean).length;
    if (content.length <= 600 || lineCount >= 3) return block;
    const sentences = content.split(/(?<=[.!?])\s+(?=[A-Z\\$(])/);
    if (sentences.length < 3) return block;
    const paragraphs: string[] = [];
    let current = "";
    for (const sentence of sentences) {
      if (current && current.length + sentence.length > 220) {
        paragraphs.push(current);
        current = sentence;
      } else {
        current = current ? `${current} ${sentence}` : sentence;
      }
    }
    if (current) paragraphs.push(current);
    return { ...block, content: paragraphs.join("\n\n") };
  });
}

export function normalizeLessonBlockType(value: string) {
  const key = value.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  return aliases[key] ?? key;
}

function topicTokens(request: LessonQualityRequest) {
  // Only the resolved topic belongs in the topic-drift signal. Including the full
  // learner command made words such as "teach", "me" and "please" falsely count
  // as evidence that an off-topic lesson was relevant.
  return request.topic.toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length >= 4);
}

function hasTopicSignal(block: { title?: string; content: string }, tokens: string[]) {
  const text = `${block.title ?? ""} ${block.content}`.toLowerCase();
  return tokens.some(token => text.includes(token)
    || (token.endsWith("s") && token.length > 4 && text.includes(token.slice(0, -1)))
    || (!token.endsWith("s") && token.length > 4 && text.includes(`${token}s`)));
}

function hasAnswerLeak(content: string) {
  return /\b(?:answer|solution|correct answer|correct option|therefore)\s*:/i.test(content) || /\b(?:the answer is|the correct answer is|so the answer is)\b/i.test(content);
}

function hasBareNumericalResult(content: string) {
  return /(?:^|\n)\s*(?:answer\s*)?[:=]?\s*[-+]?\d+(?:\.\d+)?\s*(?:[A-Za-z%°]+)?\s*(?:$|\n)/i.test(content.trim());
}

export function lessonQualityFailures(lesson: { blocks: LessonQualityBlock[]; title?: string }, request: LessonQualityRequest) {
  const normalized = lesson.blocks.map(block => ({ ...block, normalizedType: normalizeLessonBlockType(block.type), searchable: `${block.title ?? ""} ${block.content}`.trim().toLowerCase() }));
  const types = new Set(normalized.map(block => block.normalizedType));
  const contents = normalized.map(block => block.content.trim().toLowerCase());
  const text = contents.join(" ");
  const searchableText = normalized.map(block => block.searchable).join(" ");
  const failures: string[] = [];
  const has = (...names: string[]) => names.some(name => types.has(name));
  const tokens = topicTokens(request);

  const diagramBlocks = normalized.filter(block => block.normalizedType === "diagram");
  const supportedDiagrams = new Set(["coordinate-plane", "wave-shape", "force-pairs", "root-bracket", "unit-circle", "binary-place-values", "particle-model", "cell-structure", "flowchart", "series-circuit"]);
  if (diagramBlocks.some(block => !supportedDiagrams.has(block.content.trim()))) failures.push("unsupported-diagram");
  const requiredDiagram = requiredDiagramFor(request);

  if (request.intent === "teach" && requiredDiagram && !diagramBlocks.some(block => block.content.trim() === requiredDiagram)) {
    failures.push("missing-relevant-diagram");
  }

  const broadOrDeep = request.broadTopic || request.depth === "deep";
  // Sectioned generation plans 4-7 sections of 3-5 blocks (the final one up to 8), including for topics not
  // flagged broad (production 2026-11-22: a 29-block "Thermal energy" lesson was refused at 24). The hard
  // ceiling is the server's persist limit of 36.
  if (normalized.length > 36) failures.push("too-many-blocks");
  if (normalized.length < 4) failures.push("insufficient-structure");
  if (request.depth === "deep" && normalized.length < 10) failures.push("deep-session-too-thin");
  if (request.broadTopic && normalized.length < 16) failures.push("broad-topic-too-thin");
  if (broadOrDeep) {
    const richTypes = new Set(["map", "concept", "structure", "mechanism", "example", "application", "synthesis", "curiosity"]);
    const richBlocks = normalized.filter(block => richTypes.has(block.normalizedType) && block.content.trim().length >= 100);
    const examples = normalized.filter(block => ["example", "application"].includes(block.normalizedType)).length;
    const checkpoints = normalized.filter(block => block.normalizedType === "checkpoint").length;
    const continuation = normalized.filter(block => ["synthesis", "curiosity", "next"].includes(block.normalizedType)).length;
    if (richBlocks.length < 6) failures.push("deep-content-too-thin");
    if (examples < 3 && request.intent === "teach") failures.push("deep-examples-too-thin");
    if (checkpoints < 3 && request.intent !== "practice") failures.push("deep-checkpoints-too-thin");
    if (continuation < 1) failures.push("deep-continuation-missing");
  }
  // These phrases are style warnings, not grounds to discard an otherwise valid lesson.
  // Rejecting an otherwise sound lesson forces an unnecessary second generation cycle.
  // Intentionally not a hard failure.
  if (new Set(contents).size < Math.min(lesson.blocks.length, 8)) failures.push("repetition");

  // Diagrams, formulas and code are not prose: a one-line SVG/ASCII figure is not a "wall of text".
  const nonProseTypes = new Set(["diagram", "formula", "math", "code"]);
  const wallOfText = normalized.some(block => {
    if (nonProseTypes.has(block.normalizedType)) return false;
    const content = block.content.trim();
    const lineCount = content.split(/\n+/).map(line => line.trim()).filter(Boolean).length;
    const sentenceCount = (content.match(/[.!?](?:\s|$)/g) ?? []).length;
    const avgSentenceLength = sentenceCount ? content.length / sentenceCount : content.length;
    return (content.length > 700 && lineCount < 3) || (content.length > 1100 && lineCount < 4) || (avgSentenceLength > 260 && lineCount < 3);
  });
  if (wallOfText) failures.push("wall-of-text");

  const structuredTypes = new Set(["objective", "prior", "definition", "formula", "example", "checkpoint", "exam", "mistake", "misconception", "practice", "summary"]);
  const structuredBlocks = normalized.filter(block => structuredTypes.has(block.normalizedType));
  const lineStructuredCount = structuredBlocks.filter(block => {
    const lines = block.content.split(/\n+/).map(line => line.trim()).filter(Boolean);
    return lines.length >= 2 || /(^|\n)([-•]|\d+[.)]|Given:|Method:|Step\s+\d+:|Question:|Answer:|Approach:)/i.test(block.content);
  }).length;
  // Structure is primarily a rendering concern. Do not reject a lesson merely because
  // the model used prose instead of the preferred Given/Method/Step layout.
  // Intentionally not a hard failure.

  if (!has("objective") && !/learning objective|by the end|you will be able to|student will be able to/i.test(searchableText)) failures.push("objective");
  if (!has("concept", "definition") && !/explains?|means|refers to|concept|understand|why it works/i.test(searchableText)) failures.push("concept");
  if (!has("example") && !/worked example|for example|consider this|let's work through|step 1/i.test(searchableText)) failures.push("example");
  if (!has("checkpoint") && !/pause and think|stop and think|check yourself|your turn|before reading on/i.test(searchableText)) failures.push("checkpoint");
  if (!has("summary") && !/key takeaway|in summary|to recap|remember that|you should now be able to/i.test(searchableText)) failures.push("summary");

  const topicRelevantCount = normalized.filter(block => hasTopicSignal(block, tokens)).length;
  const requiredRelevant = request.broadTopic
    ? Math.max(3, Math.ceil(normalized.length * 0.15))
    : Math.max(2, Math.ceil(normalized.length * 0.30));
  if (tokens.length > 0 && topicRelevantCount < requiredRelevant) failures.push("topic-drift");

  const titleText = (lesson.title ?? "").toLowerCase();
  if (tokens.length > 0 && !tokens.some(token => titleText.includes(token))) failures.push("title-topic-drift");

  const checkpointBlocks = normalized.filter(block => block.normalizedType === "checkpoint");
  if (request.intent !== "practice" && checkpointBlocks.some(block => hasAnswerLeak(block.content))) failures.push("checkpoint-reveals-answer");

  const artificialHeadings = ["demanded worked example", "distribution myth", "verification habit", "examiner looks for", "common exam error"];
  if (normalized.some(block => artificialHeadings.some(heading => `${block.title ?? ""} ${block.content}`.toLowerCase().startsWith(heading)))) failures.push("template-heading");

  const applications = normalized.filter(block => block.normalizedType === "application");
  // "Application" also covers real-world and transfer blocks, which explain rather than set a task, so
  // only genuinely empty or placeholder content is rejected (production 2026-11-21: valid sections
  // were rejected three times in a row for lacking task keywords).
  if (applications.some(block => block.content.trim().length < 60 || /^(tbd|todo|placeholder|n\/a)\b/i.test(block.content.trim()))) failures.push("empty-application");

  const numericalBlocks = normalized.filter(block => /\d/.test(block.content));
  if (numericalBlocks.some(block => hasBareNumericalResult(block.content))) failures.push("bare-numerical-result");

  if (request.intent === "teach") {
    if (!has("example")) failures.push("teach-example");
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

  const quantitative = isQuantitativeSubject(request.subject);
  const formulaTopic = isFormulaTopic(request.topic, request.prompt);
  if (quantitative && formulaTopic && request.intent !== "comparison" && !has("formula") && !/formula|equation|relationship|method|calculation|substitut|identity/i.test(searchableText)) failures.push("formula");

  // A practice set is not self-study-ready when it asks several numbered questions
  // but only supplies answer guidance for some of them. This caught a live Integration
  // lesson where Question 3 had no guidance while Questions 1 and 2 did.
  const practiceBlocks = normalized.filter(block => block.normalizedType === "practice");
  for (const block of practiceBlocks) {
    const questionIds = [...block.content.matchAll(/(?:practice\\s+)?(?:question|problem|exercise)\\s*#?\\s*(\\d+)\\s*:/gi)]
      .map(match => match[1]);
    const answerIds = new Set([...block.content.matchAll(/(?:answer\\s+guidance|worked\\s+solution|solution|answer)\\s*#?\\s*(\\d+)\\s*:/gi)]
      .map(match => match[1]));
    if (questionIds.length >= 2 && questionIds.some(id => !answerIds.has(id))) {
      failures.push("practice-answer-guidance-incomplete");
    }
  }

  // The exam-transfer section must contain an actual task, not only generic advice
  // about how to approach exams. Generic advice can accompany a question but cannot
  // substitute for one.
  const examBlocks = normalized.filter(block => block.normalizedType === "exam");
  if (examBlocks.some(block => !/\\bquestion\\s*:/i.test(block.content) && !/\\?/.test(block.content))) {
    failures.push("exam-transfer-no-task");
  }

  return { failures: [...new Set(failures)], types: [...types] };
}
