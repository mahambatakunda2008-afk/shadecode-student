/**
 * Structured lesson content builder.
 *
 * The model is allowed to return either the requested markdown contract or
 * structured JSON. The builder normalizes both into the canonical lesson shape.
 * It never relies on a particular model's formatting quirks.
 */
import { StructuredLesson, Section, Example, PracticeItem, QuizItem, createExplanationTemplate } from "./templates";
import { validateLessonStructure, sanitizeLesson } from "./validators";

export interface ContentBuilderConfig {
  template: StructuredLesson;
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  maxTokens?: number;
  includeExamples?: boolean;
  includePractice?: boolean;
}

export interface BuildResult {
  success: boolean;
  lesson?: StructuredLesson;
  error?: string;
  validationScore?: number;
}

function clean(value: unknown, max = 7000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asStringArray(value: unknown, max = 12): string[] {
  return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && x.trim()).map(x => clean(x, 1000)).slice(0, max) : [];
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim().replace(/^\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`$/, "");
  try {
    const value = JSON.parse(trimmed);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      const value = JSON.parse(trimmed.slice(start, end + 1));
      return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
}

function normalizeExample(raw: unknown, index: number): Example | null {
  if (typeof raw === "string" && raw.trim()) return { title: `Worked example ${index + 1}`, description: clean(raw) };
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const title = clean(x.title || x.heading) || `Worked example ${index + 1}`;
  const description = clean(x.description || x.content || x.problem || x.question);
  if (!description) return null;
  return {
    title: title.slice(0, 200),
    description,
    code: clean(x.code, 4000) || undefined,
    solution: clean(x.solution || x.answer || x.explanation, 5000) || undefined,
  };
}

function normalizePractice(raw: unknown, index: number): PracticeItem | null {
  if (typeof raw === "string" && raw.trim()) {
    return { id: `practice-${index + 1}`, question: clean(raw, 1800), type: "short_answer", correctAnswer: "See the explanation provided after attempting.", explanation: "Attempt the question first, then compare your reasoning with the lesson explanation.", difficulty: "medium" };
  }
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const question = clean(x.question || x.prompt, 1800);
  if (!question) return null;
  const type = x.type === "multiple_choice" || x.type === "fill_blank" ? x.type : "short_answer";
  const options = asStringArray(x.options, 6);
  return {
    id: clean(x.id) || `practice-${index + 1}`,
    question,
    type,
    options: options.length ? options : undefined,
    correctAnswer: clean(x.correctAnswer || x.answer || x.solution, 1200) || "Review the worked reasoning after attempting.",
    explanation: clean(x.explanation || x.reasoning, 3000) || "Check the method, not only the final answer.",
    difficulty: x.difficulty === "easy" || x.difficulty === "hard" ? x.difficulty : "medium",
  };
}

function buildFromJson(raw: Record<string, unknown>, config: ContentBuilderConfig): StructuredLesson {
  const lesson = createExplanationTemplate(config.topic, config.level);
  lesson.title = clean(raw.title) || lesson.title;
  const metadata = raw.metadata && typeof raw.metadata === "object" ? raw.metadata as Record<string, unknown> : {};
  lesson.metadata.concepts = asStringArray(metadata.concepts || raw.concepts, 20);
  if (!lesson.metadata.concepts.length) lesson.metadata.concepts = [config.topic];
  lesson.metadata.objectives = asStringArray(metadata.objectives || raw.objectives, 12);
  if (!lesson.metadata.objectives.length) lesson.metadata.objectives = [
    `Understand ${config.topic}`,
    `Apply ${config.topic} to unfamiliar problems`,
    `Explain why the method works`,
  ];
  const estimated = Number(metadata.estimatedTime || raw.estimatedMinutes);
  if (Number.isFinite(estimated) && estimated > 0) lesson.metadata.estimatedTime = Math.min(120, Math.max(5, Math.round(estimated)));

  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
  const sections: Section[] = rawSections.map((item, i) => {
    if (!item || typeof item !== "object") return null;
    const x = item as Record<string, unknown>;
    const heading = clean(x.heading || x.title) || `Section ${i + 1}`;
    const content = clean(x.content || x.description || x.text);
    return content ? { heading, content, keyPoints: asStringArray(x.keyPoints, 8) } : null;
  }).filter(Boolean) as Section[];

  if (!sections.length && typeof raw.content === "string") {
    sections.push({ heading: "Explanation", content: clean(raw.content) });
  }
  lesson.content.explanation = sections.slice(0, 14);

  const rawExamples = Array.isArray(raw.examples) ? raw.examples : [];
  lesson.content.examples = rawExamples.map((x, i) => normalizeExample(x, i)).filter(Boolean) as Example[];
  if (!lesson.content.examples.length) {
    lesson.content.examples = sections.filter(s => /example|worked|application/i.test(s.heading)).slice(0, 3).map((s, i) => ({
      title: s.heading, description: s.content,
    }));
  }

  lesson.content.keyPoints = asStringArray(raw.keyPoints || raw.takeaways || raw.summaryPoints, 12);
  if (!lesson.content.keyPoints.length) {
    lesson.content.keyPoints = sections.flatMap(s => s.keyPoints || []).slice(0, 10);
  }

  const rawPractice = Array.isArray(raw.practice) ? raw.practice : Array.isArray(raw.practiceQuestions) ? raw.practiceQuestions : [];
  lesson.content.practice = rawPractice.map((x, i) => normalizePractice(x, i)).filter(Boolean) as PracticeItem[];

  const rawAssessment = Array.isArray(raw.assessment) ? raw.assessment : Array.isArray(raw.quiz) ? raw.quiz : [];
  lesson.assessment = rawAssessment.map((x, i) => {
    if (!x || typeof x !== "object") return null;
    const q = x as Record<string, unknown>;
    const question = clean(q.question || q.prompt, 1800);
    if (!question) return null;
    const type = q.type === "multiple_choice" || q.type === "essay" ? q.type : "short_answer";
    return {
      id: clean(q.id) || `quiz-${i + 1}`,
      question,
      type,
      options: asStringArray(q.options, 6).length ? asStringArray(q.options, 6) : undefined,
      correctAnswer: clean(q.correctAnswer || q.answer, 1200),
      maxPoints: Math.max(1, Number(q.maxPoints) || 1),
      rubric: clean(q.rubric, 1500) || undefined,
    } satisfies QuizItem;
  }).filter(Boolean) as QuizItem[];

  if (!lesson.assessment.length && lesson.content.practice.length) {
    lesson.assessment = lesson.content.practice.slice(0, 5).map((p, i) => ({
      id: `quiz-${i + 1}`, question: p.question, type: p.type === "multiple_choice" ? "multiple_choice" : "short_answer",
      options: p.options, correctAnswer: p.correctAnswer, maxPoints: p.difficulty === "hard" ? 3 : p.difficulty === "medium" ? 2 : 1,
      rubric: p.explanation,
    }));
  }
  return lesson;
}

function buildFromMarkdown(text: string, config: ContentBuilderConfig): StructuredLesson {
  const lesson = createExplanationTemplate(config.topic, config.level);
  const lines = text.split(/\r?\n/);
  const sections: Section[] = [];
  const examples: Example[] = [];
  const practice: PracticeItem[] = [];
  const keyPoints: string[] = [];
  let mode: "section" | "examples" | "practice" | "keys" | "assessment" = "section";
  let heading = "Explanation";
  let buffer: string[] = [];
  let pendingQuestion = "";

  const flushSection = () => {
    const content = buffer.join("\n").trim();
    if (content) sections.push({ heading, content });
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/^#{1,2}\s+/.test(line)) {
      if (/^#\s+/.test(line)) {
        if (sections.length === 0 && !buffer.length) lesson.title = clean(line.replace(/^#\s+/, ""), 300) || lesson.title;
        continue;
      }
      flushSection();
      const h = line.replace(/^##\s+/, "").trim();
      if (/example|worked|application/i.test(h)) mode = "examples";
      else if (/practice|exercise|retrieval|transfer/i.test(h)) mode = "practice";
      else if (/key point|takeaway|summary/i.test(h)) mode = "keys";
      else if (/assessment|quiz|check/i.test(h)) mode = "assessment";
      else mode = "section";
      heading = h || "Explanation";
      continue;
    }

    if (/^###\s+/.test(line)) {
      if (mode === "examples") {
        const content = buffer.join("\n").trim();
        if (content) examples.push({ title: heading, description: content });
        buffer = [];
        heading = line.replace(/^###\s+/, "").trim();
      } else {
        flushSection();
        heading = line.replace(/^###\s+/, "").trim();
        mode = "section";
      }
      continue;
    }

    if (!line) {
      if (buffer.length) buffer.push("");
      continue;
    }

    if (mode === "keys" && /^[-*•]\s+/.test(line)) {
      const point = clean(line.replace(/^[-*•]\s+/, ""), 1000);
      if (point) keyPoints.push(point);
      continue;
    }

    if (mode === "practice" || mode === "assessment") {
      const q = line.replace(/^Q(?:uestion)?\s*\d*[:.)-]?\s*/i, "").trim();
      if (/^(Q(?:uestion)?\s*\d*[:.)-]?\s*)/i.test(line) || /^\d+[.)]\s+/.test(line)) {
        if (pendingQuestion) practice.push({ id: `practice-${practice.length + 1}`, question: pendingQuestion, type: "short_answer", correctAnswer: "See solution.", explanation: "Attempt before checking the worked reasoning.", difficulty: "medium" });
        pendingQuestion = q.replace(/^\d+[.)]\s+/, "");
      } else if (/^(A|Answer|Solution|Explanation)\s*:/i.test(line) && pendingQuestion) {
        const answer = clean(line.replace(/^(A|Answer|Solution|Explanation)\s*:\s*/i, ""), 3000);
        practice.push({ id: `practice-${practice.length + 1}`, question: pendingQuestion, type: "short_answer", correctAnswer: answer, explanation: answer, difficulty: "medium" });
        pendingQuestion = "";
      } else {
        buffer.push(line);
      }
      continue;
    }

    if (mode === "examples") buffer.push(line);
    else buffer.push(line);
  }
  flushSection();
  if (pendingQuestion) practice.push({ id: `practice-${practice.length + 1}`, question: pendingQuestion, type: "short_answer", correctAnswer: "Review the worked solution.", explanation: "Attempt the question before revealing the solution.", difficulty: "medium" });

  lesson.content.explanation = sections.slice(0, 14);
  lesson.content.examples = examples.slice(0, 6);
  lesson.content.practice = practice.slice(0, 12);
  lesson.content.keyPoints = keyPoints.slice(0, 12);

  if (!lesson.content.examples.length) {
    lesson.content.examples = sections.filter(s => /example|worked|application/i.test(s.heading)).slice(0, 3).map(s => ({ title: s.heading, description: s.content }));
  }
  if (!lesson.content.keyPoints.length) {
    lesson.content.keyPoints = sections.flatMap(s => s.content.split(/[.!?]/).map(x => x.trim()).filter(x => x.length > 20).slice(0, 2)).slice(0, 8);
  }
  if (!lesson.content.practice.length) {
    lesson.content.practice = [
      { id: "practice-1", question: `Explain the central idea of ${config.topic} in your own words.`, type: "short_answer", correctAnswer: "A correct response should accurately define the concept and explain its mechanism.", explanation: "Use the lesson's definitions and causal reasoning.", difficulty: "easy" },
      { id: "practice-2", question: `Apply ${config.topic} to a new situation and justify your reasoning.`, type: "short_answer", correctAnswer: "A correct response applies the relevant principle and explains why it applies.", explanation: "Focus on the reasoning chain rather than guessing the final answer.", difficulty: "medium" },
      { id: "practice-3", question: `What is a common misconception about ${config.topic}, and how would you detect it?`, type: "short_answer", correctAnswer: "Identify a genuine misconception and contrast it with the correct principle.", explanation: "The goal is to diagnose the reasoning error.", difficulty: "hard" },
    ];
  }
  lesson.assessment = lesson.content.practice.slice(0, 5).map((p, i) => ({
    id: `quiz-${i + 1}`, question: p.question, type: "short_answer", correctAnswer: p.correctAnswer, maxPoints: p.difficulty === "hard" ? 3 : 2, rubric: p.explanation,
  }));
  return lesson;
}

function parseAIResponse(aiResponse: string, config: ContentBuilderConfig): StructuredLesson {
  const json = parseJsonObject(aiResponse);
  return json ? buildFromJson(json, config) : buildFromMarkdown(aiResponse, config);
}

export async function buildLessonContent(aiResponse: string, config: ContentBuilderConfig): Promise<BuildResult> {
  try {
    if (!aiResponse?.trim()) return { success: false, error: "AI response is empty" };
    if (!config.topic || !config.level) return { success: false, error: "Topic and level are required" };

    const lesson = parseAIResponse(aiResponse, config);
    lesson.metadata.estimatedTime = Math.max(5, Math.min(120, lesson.metadata.estimatedTime || Math.ceil(aiResponse.split(/\s+/).length / 180)));
    const sanitizedLesson = sanitizeLesson(lesson);
    const validation = validateLessonStructure(sanitizedLesson);

    return {
      success: validation.isValid,
      lesson: sanitizedLesson,
      validationScore: validation.score,
      error: validation.isValid ? undefined : validation.errors.map(e => `${e.field}: ${e.error}`).join("; "),
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error building content" };
  }
}

export function enrichContent(lesson: StructuredLesson, resources: { type: "link" | "video" | "document" | "tool"; title: string; url: string }[]): StructuredLesson {
  lesson.metadata.tags = lesson.metadata.tags || [];
  if (resources.length) lesson.metadata.tags.push("has-resources");
  return lesson;
}

export function chunkContent(lesson: StructuredLesson, maxChunkSize = 3): StructuredLesson[] {
  const chunks: StructuredLesson[] = [];
  let currentChunk = { ...lesson, content: { ...lesson.content, explanation: [] as Section[] } };
  for (const section of lesson.content.explanation) {
    currentChunk.content.explanation.push(section);
    if (currentChunk.content.explanation.length >= maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = { ...lesson, content: { ...lesson.content, explanation: [] as Section[] } };
    }
  }
  if (currentChunk.content.explanation.length) chunks.push(currentChunk);
  return chunks;
}

export function estimateTokenCount(lesson: StructuredLesson): number {
  return Math.ceil(JSON.stringify(lesson).length / 4);
}

export function fitsTokenBudget(lesson: StructuredLesson, maxTokens: number): boolean {
  return estimateTokenCount(lesson) <= maxTokens;
}

export function generatePracticeFromContent(lesson: StructuredLesson, count = 3): PracticeItem[] {
  return lesson.content.keyPoints.slice(0, count).map((point, i) => ({
    id: `practice-${i + 1}`,
    question: `Explain this key idea: ${point}`,
    type: "short_answer",
    correctAnswer: point,
    explanation: "Connect your answer to the principle taught in the lesson.",
    difficulty: "easy",
  }));
}

export function summarizeLesson(lesson: StructuredLesson): string {
  return [
    `**${lesson.title}**`,
    `Topic: ${lesson.topic}`,
    `Difficulty: ${lesson.metadata.difficulty}`,
    `Estimated Time: ${lesson.metadata.estimatedTime} minutes`,
    `Key Concepts: ${lesson.metadata.concepts.join(", ")}`,
    lesson.content.keyPoints.length ? "\nKey Points:\n" + lesson.content.keyPoints.slice(0, 3).map(p => `  • ${p}`).join("\n") : "",
  ].filter(Boolean).join("\n");
}
