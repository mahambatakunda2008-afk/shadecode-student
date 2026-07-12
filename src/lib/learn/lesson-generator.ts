/**
 * Lesson Generator - Generate complete lessons with curriculum mapping
 *
 * Integration Points:
 * - Phase 1 Cortex (templates, validators, cache, content builder)
 * - Curriculum Mapper (ZIMSEC, Cambridge standards)
 * - AI Providers (Gemini for generation)
 *
 * Features:
 * - Generate structured lessons aligned to curriculum
 * - Track learning progression
 * - Build practice problems specific to topic
 * - Create assessment items tied to learning objectives
 */

import { StructuredLesson, createExplanationTemplate, createPracticeTemplate, createQuizTemplate } from "@/lib/cortex/templates";
import { validateLessonStructure, ValidationResult } from "@/lib/cortex/validators";
import { ResponseCache } from "@/lib/cortex/cache";
import { buildLessonContent } from "@/lib/cortex/contentBuilder";
import { CurriculumMapper, MappingResult } from "./curriculum-mapper";

export interface LessonGenerationRequest {
  subject: string;
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  format?: "full" | "quick" | "deep";
  style?: "visual" | "analytical" | "practical";
  curriculum?: "ZIMSEC" | "Cambridge" | "generic";
  userId?: string;
}

export interface GeneratedLesson {
  id: string;
  title: string;
  subject: string;
  topic: string;
  content: {
    explanation: {
      heading: string;
      content: string;
      examples: Array<{ description: string; code?: string }>;
      keyPoints: string[];
    }[];
    practice: {
      question: string;
      hints: string[];
      answer: string;
      difficulty: string;
      type: string;
    }[];
    assessment: {
      question: string;
      options?: string[];
      correctAnswer: string;
      explanation: string;
    }[];
  };
  metadata: {
    estimatedTime: number; // minutes
    difficulty: string;
    objectives: string[];
    concepts: string[];
    curriculumMapping?: MappingResult;
    generatedAt: Date;
    validationScore: number; // 0-100 from Phase 1 validators
  };
  resources?: {
    title: string;
    url: string;
    type: "video" | "article" | "interactive" | "worksheet";
  }[];
}

export interface LessonGenerationResponse {
  success: boolean;
  lesson?: GeneratedLesson;
  error?: string;
  cacheHit?: boolean;
  timeTaken: number; // milliseconds
}

/**
 * Lesson Generator Service
 *
 * This is the main entry point for lesson generation.
 * It orchestrates:
 * 1. Cache lookup (Phase 1)
 * 2. Curriculum mapping
 * 3. AI-based content generation
 * 4. Validation (Phase 1)
 * 5. Structured output generation
 */
export class LessonGenerator {
  private cache: ResponseCache;
  private curriculumMapper: CurriculumMapper;
  private aiProvider: any; // Cortex engine

  constructor(cortexEngine: any) {
    this.cache = new ResponseCache();
    this.curriculumMapper = new CurriculumMapper();
    this.aiProvider = cortexEngine;
  }

  /**
   * Generate a complete lesson
   * Returns cached result if available
   */
  async generateLesson(
    request: LessonGenerationRequest
  ): Promise<LessonGenerationResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Generate cache key
      const cacheKey = this.generateCacheKey(request);

      // Step 2: Check cache
      const cachedLesson = this.cache.get(cacheKey);
      if (cachedLesson) {
        return {
          success: true,
          lesson: cachedLesson,
          cacheHit: true,
          timeTaken: Date.now() - startTime,
        };
      }

      // Step 3: Generate new lesson
      const lesson = await this.generateNewLesson(request);

      // Step 4: Validate lesson
      const validation = validateLessonStructure(lesson);
      if (validation.score < 50) {
        throw new Error(
          `Lesson validation failed (score: ${validation.score}). ${validation.errors.join(", ")}`
        );
      }

      // Step 5: Cache result
      this.cache.set(cacheKey, lesson);

      return {
        success: true,
        lesson,
        cacheHit: false,
        timeTaken: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timeTaken: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate a new lesson from scratch
   */
  private async generateNewLesson(
    request: LessonGenerationRequest
  ): Promise<GeneratedLesson> {
    const lessonId = this.generateId();

    // Determine format based on request
    const format = request.format || "full";
    const style = request.style || "practical";

    // Step 1: Build initial structure based on format
    let explanation: StructuredLesson;

    if (format === "quick") {
      explanation = createExplanationTemplate();
      explanation = this.adaptTemplate(explanation, "quick");
    } else if (format === "deep") {
      explanation = createExplanationTemplate();
      explanation = this.adaptTemplate(explanation, "deep");
    } else {
      explanation = createExplanationTemplate();
    }

    // Step 2: Generate AI content for explanation
    const explanationContent = await this.generateExplanationContent(
      request,
      style
    );

    // Step 3: Generate practice problems
    const practice = await this.generatePracticeContent(request, style);

    // Step 4: Generate assessment items
    const assessment = await this.generateAssessmentContent(request);

    // Step 5: Map to curriculum
    let curriculumMapping: MappingResult | undefined;
    if (request.curriculum) {
      try {
        curriculumMapping = await this.curriculumMapper.mapLessonToCurriculum(
          explanation,
          request.subject,
          request.topic,
          request.curriculum
        );
      } catch (error) {
        console.warn("Curriculum mapping failed:", error);
      }
    }

    // Step 6: Extract objectives and concepts
    const objectives = this.extractObjectives(explanationContent);
    const concepts = this.extractConcepts(explanationContent);

    // Step 7: Estimate time based on format
    const estimatedTime = this.estimateTimeRequired(
      format,
      practice.length,
      assessment.length
    );

    // Step 8: Validate all content
    const validation = validateLessonStructure(explanation);

    // Step 9: Build final lesson object
    const lesson: GeneratedLesson = {
      id: lessonId,
      title: this.generateLessonTitle(request),
      subject: request.subject,
      topic: request.topic,
      content: {
        explanation: explanationContent,
        practice,
        assessment,
      },
      metadata: {
        estimatedTime,
        difficulty: request.level,
        objectives,
        concepts,
        curriculumMapping,
        generatedAt: new Date(),
        validationScore: validation.score,
      },
      resources: this.suggestResources(request.subject, request.topic),
    };

    return lesson;
  }

  /**
   * Generate explanation content (AI-powered)
   */
  private async generateExplanationContent(
    request: LessonGenerationRequest,
    style: string
  ): Promise<GeneratedLesson["content"]["explanation"]> {
    const prompt = this.buildExplanationPrompt(request, style);

    const response = await this.aiProvider.generateLesson({
      topic: request.topic,
      subject: request.subject,
      level: request.level,
      style,
      prompt,
    });

    // Parse response into explanation sections
    const sections = this.parseExplanationSections(response.content);

    return sections;
  }

  /**
   * Generate practice problems (AI-powered)
   */
  private async generatePracticeContent(
    request: LessonGenerationRequest,
    style: string
  ): Promise<GeneratedLesson["content"]["practice"]> {
    const count =
      request.format === "quick"
        ? 3
        : request.format === "deep"
          ? 15
          : 8;

    const prompt = this.buildPracticePrompt(request, count, style);

    const response = await this.aiProvider.generateLesson({
      topic: request.topic,
      subject: request.subject,
      level: request.level,
      style,
      prompt,
    });

    const problems = this.parsePracticeProblems(response.content, count);

    return problems;
  }

  /**
   * Generate assessment items
   */
  private async generateAssessmentContent(
    request: LessonGenerationRequest
  ): Promise<GeneratedLesson["content"]["assessment"]> {
    const format =
      request.format === "quick"
        ? 3
        : request.format === "deep"
          ? 10
          : 5;

    const prompt = this.buildAssessmentPrompt(request, format);

    const response = await this.aiProvider.generateLesson({
      topic: request.topic,
      subject: request.subject,
      level: request.level,
      prompt,
    });

    const items = this.parseAssessmentItems(response.content, format);

    return items;
  }

  /**
   * Build explanation generation prompt
   */
  private buildExplanationPrompt(
    request: LessonGenerationRequest,
    style: string
  ): string {
    const styleGuides = {
      visual: "Use diagrams, visual descriptions, and spatial relationships",
      analytical: "Use logical proofs, formal definitions, and step-by-step reasoning",
      practical:
        "Use real-world examples, applications, and hands-on activities",
    };

    return `
You are an expert educator. Create a comprehensive explanation of "${request.topic}" for a ${request.level} level student in ${request.subject}.

Style: ${styleGuides[style as keyof typeof styleGuides] || styleGuides.practical}

Structure your response with:
1. Main Concept (clear, simple definition)
2. Key Principles (list 3-5 core principles)
3. Worked Examples (2-3 detailed examples with steps)
4. Common Misconceptions (address 2-3 typical misunderstandings)
5. Key Takeaways (summarize main points)

Use clear language appropriate for a ${request.level} student.
Include practical examples from real life or the subject field.
    `.trim();
  }

  /**
   * Build practice problem generation prompt
   */
  private buildPracticePrompt(
    request: LessonGenerationRequest,
    count: number,
    style: string
  ): string {
    return `
Generate ${count} practice problems for "${request.topic}" at ${request.level} level in ${request.subject}.

For each problem:
1. Write a clear question
2. Provide 2-3 helpful hints (for difficult parts)
3. Show the complete solution
4. Indicate difficulty (easy/medium/hard)
5. Specify problem type (calculation/conceptual/application/analysis)

Format each problem clearly with separators.
Vary the problem types and difficulty levels.
Include at least one real-world application problem.
    `.trim();
  }

  /**
   * Build assessment question generation prompt
   */
  private buildAssessmentPrompt(
    request: LessonGenerationRequest,
    count: number
  ): string {
    return `
Generate ${count} assessment questions for "${request.topic}" at ${request.level} level in ${request.subject}.

Format: Mix of multiple choice and short answer.

For each question:
1. Clear question text
2. For MCQ: 4 options with one correct answer
3. For short answer: correct answer with brief explanation
4. Explain why correct answer is right

Make questions test understanding, not just memorization.
    `.trim();
  }

  /**
   * Parse AI response into explanation sections
   */
  private parseExplanationSections(
    content: string
  ): GeneratedLesson["content"]["explanation"] {
    const sections: GeneratedLesson["content"]["explanation"] = [];

    // Split by numbered sections or headers
    const parts = content.split(/\n(?=\d+\.|#{1,3}\s|##\s)/);

    for (const part of parts) {
      const lines = part.trim().split("\n");
      if (lines.length < 2) continue;

      const heading = lines[0].replace(/^#+\s+/, "").replace(/^\d+\.\s+/, "");
      const contentLines = lines.slice(1).join("\n");

      // Extract examples (lines starting with "Example" or "e.g.")
      const exampleRegex = /(?:Example|e\.g\.).*?(?=\n(?:Example|Key|$))/gs;
      const examples = (contentLines.match(exampleRegex) || []).map((ex) => ({
        description: ex.trim(),
        code: undefined,
      }));

      // Extract key points (bullet points)
      const keyPoints = contentLines
        .split("\n")
        .filter((line) => line.match(/^[-•*]\s+/))
        .map((line) => line.replace(/^[-•*]\s+/, "").trim());

      sections.push({
        heading,
        content: contentLines,
        examples,
        keyPoints,
      });
    }

    return sections;
  }

  /**
   * Parse AI response into practice problems
   */
  private parsePracticeProblems(
    content: string,
    count: number
  ): GeneratedLesson["content"]["practice"] {
    const problems: GeneratedLesson["content"]["practice"] = [];

    // Split problems by numbering or separator
    const problemBlocks = content.split(/\n(?=Problem\s+\d+|^P\d+|\d+\.)/m);

    for (const block of problemBlocks.slice(0, count)) {
      const lines = block.trim().split("\n");
      if (lines.length < 3) continue;

      const questionMatch = block.match(/[?!.]\s*$/m);
      const question = lines[0]
        .replace(/^P?\d+\.\s+/, "")
        .replace(/Problem\s+\d+:\s+/, "");

      const hintsMatch = block.match(/Hints?:?\s*([\s\S]*?)(?:Answer|Solution|$)/i);
      const hints = hintsMatch
        ? hintsMatch[1]
            .split("\n")
            .filter((h) => h.trim())
            .slice(0, 3)
        : [];

      const answerMatch = block.match(/(?:Answer|Solution):?\s*([\s\S]*?)$/i);
      const answer = answerMatch ? answerMatch[1].trim() : "";

      problems.push({
        question,
        hints,
        answer,
        difficulty: this.guessDifficulty(block),
        type: this.guessType(block),
      });
    }

    return problems;
  }

  /**
   * Parse AI response into assessment items
   */
  private parseAssessmentItems(
    content: string,
    count: number
  ): GeneratedLesson["content"]["assessment"] {
    const items: GeneratedLesson["content"]["assessment"] = [];

    const questionBlocks = content.split(/\n(?=Question\s+\d+|^Q\d+|\d+\.)/m);

    for (const block of questionBlocks.slice(0, count)) {
      const lines = block.trim().split("\n");
      if (lines.length < 2) continue;

      const question = lines[0].replace(/^Q?\d+\.\s+/, "").replace(/^Question\s+\d+:\s+/, "");

      // Check if MCQ (has options A, B, C, D)
      const optionRegex = /\n\s*[A-D]\)\s+(.+)/g;
      const optionMatches = [...block.matchAll(optionRegex)];

      let options: string[] = [];
      let correctAnswer = "";
      let explanation = "";

      if (optionMatches.length === 4) {
        // Multiple choice
        options = optionMatches.map((m) => m[1].trim());

        // Find correct answer (usually marked with ✓ or "Correct" or in explanation)
        const correctMatch = block.match(/(?:Correct|Answer|✓).*?([A-D])/i);
        if (correctMatch) {
          correctAnswer = options[correctMatch[1].charCodeAt(0) - 65] || options[0];
        }
      } else {
        // Short answer - find the answer section
        const answerMatch = block.match(/(?:Answer|Correct Answer):?\s*([^\n]+)/i);
        if (answerMatch) {
          correctAnswer = answerMatch[1].trim();
        }
      }

      // Extract explanation
      const explMatch = block.match(/(?:Explanation|Why|Because):?\s*([\s\S]*?)(?=\nQ|\n\n|$)/i);
      if (explMatch) {
        explanation = explMatch[1].split("\n")[0].trim();
      }

      items.push({
        question,
        options: options.length > 0 ? options : undefined,
        correctAnswer,
        explanation,
      });
    }

    return items;
  }

  /**
   * Guess difficulty from context
   */
  private guessDifficulty(content: string): string {
    if (
      content.toLowerCase().includes("advanced") ||
      content.toLowerCase().includes("complex")
    ) {
      return "hard";
    }
    if (
      content.toLowerCase().includes("basic") ||
      content.toLowerCase().includes("simple")
    ) {
      return "easy";
    }
    return "medium";
  }

  /**
   * Guess problem type
   */
  private guessType(content: string): string {
    const lower = content.toLowerCase();
    if (lower.includes("calculate") || lower.includes("compute")) return "calculation";
    if (lower.includes("explain") || lower.includes("why")) return "conceptual";
    if (
      lower.includes("real") ||
      lower.includes("world") ||
      lower.includes("apply")
    )
      return "application";
    if (lower.includes("analyze") || lower.includes("compare"))
      return "analysis";
    return "mixed";
  }

  /**
   * Extract learning objectives from content
   */
  private extractObjectives(explanation: GeneratedLesson["content"]["explanation"]): string[] {
    const objectives = [];
    for (const section of explanation) {
      if (
        section.heading.toLowerCase().includes("objective") ||
        section.heading.toLowerCase().includes("learning")
      ) {
        objectives.push(...section.keyPoints);
      }
    }
    return objectives.length > 0
      ? objectives
      : ["Understand the topic", "Apply concepts", "Solve problems"];
  }

  /**
   * Extract key concepts
   */
  private extractConcepts(explanation: GeneratedLesson["content"]["explanation"]): string[] {
    const concepts = new Set<string>();
    for (const section of explanation) {
      concepts.add(section.heading);
      if (section.keyPoints) {
        section.keyPoints.forEach((kp) => {
          const words = kp.split(" ");
          if (words.length <= 3) {
            concepts.add(kp);
          }
        });
      }
    }
    return Array.from(concepts);
  }

  /**
   * Estimate time required
   */
  private estimateTimeRequired(
    format: string,
    practiceCount: number,
    assessmentCount: number
  ): number {
    let time = 0;

    if (format === "quick") {
      time = 15;
    } else if (format === "deep") {
      time = 60;
    } else {
      time = 30;
    }

    // Add practice time (3-5 min per problem)
    time += practiceCount * 4;

    // Add assessment time (2-3 min per item)
    time += assessmentCount * 2.5;

    return Math.round(time);
  }

  /**
   * Generate lesson title
   */
  private generateLessonTitle(request: LessonGenerationRequest): string {
    const levelMap = {
      beginner: "Introduction to",
      intermediate: "Mastering",
      advanced: "Advanced Topics in",
    };

    return `${levelMap[request.level]} ${request.topic}`;
  }

  /**
   * Suggest related resources
   */
  private suggestResources(
    subject: string,
    topic: string
  ): GeneratedLesson["resources"] {
    // In production, this would query a resource database
    return [
      {
        title: `${topic} Overview Video`,
        url: `https://example.com/videos/${topic}`,
        type: "video",
      },
      {
        title: `${topic} Practice Worksheet`,
        url: `https://example.com/worksheets/${topic}`,
        type: "worksheet",
      },
    ];
  }

  /**
   * Adapt template for format
   */
  private adaptTemplate(
    template: StructuredLesson,
    format: string
  ): StructuredLesson {
    // Customize template based on format
    if (format === "quick") {
      template.sections = template.sections.slice(0, 2);
    } else if (format === "deep") {
      // Add more sections for deep format
      template.sections = [
        ...template.sections,
        {
          heading: "Historical Context",
          content: "",
          examples: [],
          keyPoints: [],
        },
      ];
    }
    return template;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(request: LessonGenerationRequest): string {
    return `lesson:${request.subject}:${request.topic}:${request.level}:${request.format || "full"}`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export { CurriculumMapper };
