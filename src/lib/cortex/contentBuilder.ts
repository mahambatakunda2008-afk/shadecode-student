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

import { StructuredLesson, Section, createExplanationTemplate, TEMPLATE_PRESETS } from "./templates";
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
  const lines = aiResponse.split("\n");
  const lesson = createExplanationTemplate(config.topic, config.level);

  let currentSection = 0;
  let currentContent = "";
  let currentHeading = "";
  let inKeyPoints = false;
  let inExamples = false;
  let inPractice = false;

  // Extract title from first heading
  for (const line of lines) {
    if (line.startsWith("# ")) {
      lesson.title = line.replace("# ", "").trim();
      break;
    }
  }

  // Parse sections
  for (const line of lines) {
    // Skip title line
    if (line.startsWith("# ")) continue;

    // Section heading
    if (line.startsWith("## ")) {
      const heading = line.replace("## ", "").trim().toLowerCase();

      // Save previous section
      if (currentContent.trim().length > 0) {
        if (currentSection < lesson.content.explanation.length) {
          lesson.content.explanation[currentSection].content = currentContent.trim();
          currentSection++;
        }
      }

      currentHeading = line.replace("## ", "").trim();
      currentContent = "";

      // Check what section this is
      if (heading.includes("key point") || heading.includes("summary")) {
        inKeyPoints = true;
        inExamples = false;
        inPractice = false;
      } else if (heading.includes("example")) {
        inKeyPoints = false;
        inExamples = true;
        inPractice = false;
      } else if (heading.includes("practice") || heading.includes("exercise")) {
        inKeyPoints = false;
        inExamples = false;
        inPractice = true;
      } else {
        inKeyPoints = false;
        inExamples = false;
        inPractice = false;

        // Update section heading if within explanation
        if (currentSection < lesson.content.explanation.length) {
          lesson.content.explanation[currentSection].heading = currentHeading;
        }
      }

      continue;
    }

    // Sub-section (bulleted list)
    if (line.startsWith("### ")) {
      const subHeading = line.replace("### ", "").trim();
      if (currentSection < lesson.content.explanation.length) {
        lesson.content.explanation[currentSection].heading = subHeading;
      }
      continue;
    }

    // Bullet point - key point
    if (inKeyPoints && line.startsWith("- ")) {
      const point = line.replace("- ", "").trim();
      if (point.length > 0) {
        lesson.content.keyPoints.push(point);
      }
      continue;
    }

    // Regular content
    if (line.trim().length > 0) {
      currentContent += line + "\n";
    }
  }

  // Save final section
  if (currentContent.trim().length > 0 && currentSection < lesson.content.explanation.length) {
    lesson.content.explanation[currentSection].content = currentContent.trim();
  }

  // Update metadata
  lesson.metadata.estimatedTime = estimateReadTime(aiResponse);
  lesson.metadata.objectives = generateObjectives(config.topic, config.level);

  // Remove empty explanation sections
  lesson.content.explanation = lesson.content.explanation.filter((s) => s.content.trim().length > 0);

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
