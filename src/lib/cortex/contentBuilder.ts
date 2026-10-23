/**
 * /lib/cortex/contentBuilder.ts
 *
 * Build Structured Lesson Content from AI Responses
 *
 * Responsibility:
 * - Convert AI-generated text into structured lesson format
 * - Extract sections, examples, key points
 * - Ensure schema compliance
 * - Add metadata automatically
 */

import { StructuredLesson, Section } from "./templates";
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

/**
 * Build structured lesson content from AI response
 */
export async function buildLessonContent(
  aiResponse: string,
  config: ContentBuilderConfig
): Promise<BuildResult> {
  try {
    // Validate input
    if (!aiResponse || aiResponse.trim().length === 0) {
      return {
        success: false,
        error: "AI response is empty",
      };
    }

    if (!config.topic || !config.level) {
      return {
        success: false,
        error: "Topic and level are required",
      };
    }

    // Parse AI response into lesson structure
    const lesson = parseAIResponse(aiResponse, config);

    // Validate structure
    const validationResult = validateLessonStructure(lesson);

    if (!validationResult.isValid) {
      console.warn("[ContentBuilder] Validation warnings:", validationResult.errors);
      // Continue anyway - warnings don't block, only errors do
    }

    // Sanitize all content
    const sanitizedLesson = sanitizeLesson(lesson);

    return {
      success: validationResult.isValid,
      lesson: sanitizedLesson,
      validationScore: validationResult.score,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error building content",
    };
  }
}

/**
 * Parse AI response into structured lesson
 *
 * Expected format (from AI):
 * # Title
 * ## Introduction
 * ... content ...
 * ### Key Points
 * - Point 1
 * - Point 2
 *
 * ## Examples
 * ... examples ...
 *
 * ## Practice
 * Q: Question?
 * A: Answer
 */
function parseAIResponse(aiResponse: string, config: ContentBuilderConfig): StructuredLesson {
  // Start from the requested format's template. The previous implementation
  // always created an explanation template, which silently discarded the
  // practice/quiz template contract.
  const lesson = JSON.parse(JSON.stringify(config.template)) as StructuredLesson;
  const lines = aiResponse.split("\n");
  const titleLine = lines.find((line) => /^#\s+/.test(line));
  if (titleLine) lesson.title = titleLine.replace(/^#\s+/, "").trim();

  type ParsedSection = { heading: string; body: string[] };
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const line of lines) {
    if (/^#\s+/.test(line)) continue;
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = { heading: heading[1].trim(), body: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      if (!line.trim()) continue;
      current = { heading: "Core explanation", body: [] };
      sections.push(current);
    }
    current.body.push(line);
  }

  lesson.content.explanation = [];
  lesson.content.examples = [];
  lesson.content.keyPoints = [];
  lesson.content.practice = [];
  if ("assessment" in lesson) lesson.assessment = [];

  const normalize = (value: string) => value.replace(/\r/g, "").trim();
  const bodyText = (section: ParsedSection) => normalize(section.body.join("\n"));
  const bullets = (value: string) =>
    value.split("\n")
      .map((line) => line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.+)$/)?.[1]?.trim())
      .filter((item): item is string => Boolean(item));

  for (const section of sections) {
    const heading = section.heading.toLowerCase();
    const body = bodyText(section);
    if (!body) continue;

    if (/\b(key points?|takeaways|summary|main points)\b/.test(heading)) {
      lesson.content.keyPoints.push(...bullets(body));
      // A summary is useful explanatory material too, not just a bullet list.
      if (/summary/.test(heading) && bullets(body).length === 0) {
        lesson.content.explanation.push({ heading: section.heading, content: body });
      }
      continue;
    }

    if (/\b(examples?|worked examples?)\b/.test(heading)) {
      // Preserve actual generated example content. Split only when the model
      // clearly labels separate examples; otherwise retain the full section.
      const chunks = body.split(/(?=^\s*(?:#{1,3}\s*)?(?:worked\s+)?example\s*(?:\d+|[A-Z])?\s*[:.)-]?\s*$)/im)
        .map(normalize)
        .filter(Boolean);
      const usableChunks = chunks.length ? chunks : [body];
      for (let index = 0; index < usableChunks.length; index++) {
        const chunk = usableChunks[index];
        const chunkLines = chunk.split("\n");
        const first = chunkLines[0]?.replace(/^#{1,3}\s*/, "").trim() ?? "";
        const hasLabel = /^(worked\s+)?example\b/i.test(first);
        lesson.content.examples.push({
          title: hasLabel ? first : `Example ${index + 1}`,
          description: hasLabel ? chunkLines.slice(1).join("\n").trim() || chunk : chunk,
        });
      }
      continue;
    }

    if (/\b(practice|exercises?|retrieval questions?|questions)\b/.test(heading)) {
      // Only convert explicitly answered items into scoreable practice. Do not
      // invent answer keys when the model supplies questions without answers.
      const itemStarts = [...body.matchAll(/(?:^|\n)\s*(?:Q(?:uestion)?\s*\d*\s*[:.)-]|\d+[.)]\s+)/g)];
      const chunks = itemStarts.length
        ? itemStarts.map((match, index) => {
            const begin = (match.index ?? 0) + (match[0].startsWith("\n") ? 1 : 0);
            const next = itemStarts[index + 1];
            return body.slice(begin, next?.index ?? body.length).trim();
          })
        : [];
      for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];
        const answerMatch = chunk.match(/(?:^|\n)\s*(?:A(?:nswer)?|Correct answer)\s*[:.)-]\s*([\s\S]*?)(?=\n\s*(?:Explanation|Reasoning)\s*[:.)-]|$)/i);
        const explanationMatch = chunk.match(/(?:^|\n)\s*(?:Explanation|Reasoning)\s*[:.)-]\s*([\s\S]*)$/i);
        const question = chunk
          .replace(/^\s*(?:Q(?:uestion)?\s*\d*\s*[:.)-]|\d+[.)]\s+)/i, "")
          .split(/\n\s*(?:A(?:nswer)?|Correct answer|Explanation|Reasoning)\s*[:.)-]/i)[0]
          .trim();
        const correctAnswer = answerMatch?.[1]?.trim();
        const explanation = explanationMatch?.[1]?.trim();
        if (!question || !correctAnswer || !explanation) continue;
        lesson.content.practice.push({
          id: `practice-${lesson.content.practice.length + 1}`,
          question,
          type: "short_answer",
          correctAnswer,
          explanation,
          difficulty: config.level === "beginner" ? "easy" : config.level === "advanced" ? "hard" : "medium",
        });
      }
      continue;
    }

    lesson.content.explanation.push({ heading: section.heading, content: body });
    // Collect clearly marked key points embedded in explanatory sections.
    lesson.content.keyPoints.push(...bullets(body));
  }

  // Some model responses contain prose without markdown headings. Keep the
  // actual response available to the learner instead of returning an empty
  // lesson, while still letting the quality gate decide whether it is enough.
  if (lesson.content.explanation.length === 0) {
    const fallbackText = lines.filter((line) => !/^#\s+/.test(line)).join("\n").trim();
    if (fallbackText) {
      lesson.content.explanation.push({ heading: "Explanation", content: fallbackText });
    }
  }

  lesson.content.keyPoints = [...new Set(lesson.content.keyPoints.filter(Boolean))];
  lesson.metadata.estimatedTime = estimateReadTime(aiResponse);
  lesson.metadata.objectives = generateObjectives(config.topic, config.level);
  return lesson;
}

/**
 * Estimate reading time based on content length
 */
function estimateReadTime(content: string): number {
  const wordCount = content.split(/\s+/).length;
  const wordsPerMinute = 200; // Average reading speed
  const minutes = Math.max(5, Math.ceil(wordCount / wordsPerMinute));
  return Math.min(minutes, 60); // Cap at 60 minutes
}

/**
 * Generate learning objectives for topic
 */
function generateObjectives(topic: string, level: string): string[] {
  const baseObjectives = [
    `Understand the fundamentals of ${topic}`,
    `Apply ${topic} concepts in practical scenarios`,
    `Analyze ${topic} in different contexts`,
  ];

  if (level === "advanced") {
    baseObjectives.push(`Evaluate complex ${topic} scenarios`);
    baseObjectives.push(`Create solutions using ${topic}`);
  } else if (level === "intermediate") {
    baseObjectives.push(`Compare different approaches to ${topic}`);
  }

  return baseObjectives;
}

/**
 * Enrich lesson with additional resources
 */
export interface Resource {
  type: "link" | "video" | "document" | "tool";
  title: string;
  url: string;
}

export function enrichContent(lesson: StructuredLesson, resources: Resource[]): StructuredLesson {
  // Add resources to metadata
  lesson.metadata.tags = lesson.metadata.tags || [];

  if (resources.length > 0) {
    lesson.metadata.tags.push(`has-resources`);
  }

  return lesson;
}

/**
 * Split large content into digestible chunks
 */
export function chunkContent(lesson: StructuredLesson, maxChunkSize: number = 3): StructuredLesson[] {
  const chunks: StructuredLesson[] = [];
  let currentChunk = { ...lesson, content: { ...lesson.content, explanation: [] as Section[] } };

  for (const section of lesson.content.explanation) {
    currentChunk.content.explanation.push(section);

    if (currentChunk.content.explanation.length >= maxChunkSize) {
      chunks.push(currentChunk);
      currentChunk = { ...lesson, content: { ...lesson.content, explanation: [] as Section[] } };
    }
  }

  if (currentChunk.content.explanation.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Estimate token count for content
 */
export function estimateTokenCount(lesson: StructuredLesson): number {
  const content = JSON.stringify(lesson);
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(content.length / 4);
}

/**
 * Check if content fits within token budget
 */
export function fitsTokenBudget(lesson: StructuredLesson, maxTokens: number): boolean {
  const tokens = estimateTokenCount(lesson);
  return tokens <= maxTokens;
}

/**
 * Auto-generate practice items from lesson content
 */
export function generatePracticeFromContent(lesson: StructuredLesson, count: number = 3) {
  const practices = [];

  // Generate simple practice questions from key points
  for (let i = 0; i < Math.min(count, lesson.content.keyPoints.length); i++) {
    practices.push({
      id: `practice-${i + 1}`,
      question: `What is the key point about "${lesson.content.keyPoints[i]}"?`,
      type: "short_answer" as const,
      correctAnswer: lesson.content.keyPoints[i],
      explanation: `This is one of the main takeaways from this lesson.`,
      difficulty: "easy" as const,
    });
  }

  return practices;
}

/**
 * Summarize lesson for preview
 */
export function summarizeLesson(lesson: StructuredLesson): string {
  const parts = [
    `**${lesson.title}**`,
    `Topic: ${lesson.topic}`,
    `Difficulty: ${lesson.metadata.difficulty}`,
    `Estimated Time: ${lesson.metadata.estimatedTime} minutes`,
    `Key Concepts: ${lesson.metadata.concepts.join(", ")}`,
  ];

  if (lesson.content.keyPoints.length > 0) {
    parts.push(`\nKey Points:`);
    lesson.content.keyPoints.slice(0, 3).forEach((p) => {
      parts.push(`  • ${p}`);
    });
  }

  return parts.join("\n");
}
