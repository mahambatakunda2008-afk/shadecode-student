/**
 * Content Builder - Enhance lessons with multimedia resources and interactive elements
 *
 * Integrates with:
 * - Lesson Generator (builds on generated content)
 * - Cortex Content Builder (Phase 1)
 * - Resource providers (videos, images, code samples)
 *
 * Features:
 * - Enrich lessons with multimedia
 * - Add interactive elements
 * - Embed code examples with syntax highlighting
 * - Support LaTeX for mathematics
 * - Link to external resources
 */

import { GeneratedLesson } from "./lesson-generator";

export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  type: "video" | "article" | "interactive" | "worksheet" | "image" | "code";
  subject: string;
  topic?: string;
  difficulty?: string;
  duration?: number; // seconds
  thumbnail?: string;
}

export interface EnrichedContent {
  text: string;
  markup: "markdown" | "html";
  embedded?: EmbeddedElement[];
  metadata?: Record<string, unknown>;
}

export interface EmbeddedElement {
  type: "image" | "video" | "code" | "math" | "interactive";
  data: Record<string, unknown>;
  caption?: string;
  credit?: string;
}

export interface EnrichedLesson extends GeneratedLesson {
  enrichedContent: {
    explanation: EnrichedContent[];
    practice: EnrichedContent[];
    assessment: EnrichedContent[];
  };
  interactiveElements: InteractiveElement[];
  relatedResources: Resource[];
}

export interface InteractiveElement {
  id: string;
  type: "quiz" | "simulation" | "coding-challenge" | "visualization";
  topic: string;
  content: string;
  difficulty: string;
}

/**
 * Content enrichment engine
 * Transforms plain text lessons into rich multimedia content
 */
export class ContentBuilder {
  private resourceCache: Map<string, Resource[]>;
  private syntaxHighlighter: SyntaxHighlighter;
  private mathRenderer: MathRenderer;

  constructor() {
    this.resourceCache = new Map();
    this.syntaxHighlighter = new SyntaxHighlighter();
    this.mathRenderer = new MathRenderer();
  }

  /**
   * Enrich a lesson with multimedia and interactive elements
   */
  async enrichLesson(
    lesson: GeneratedLesson,
    options: {
      includeVideos?: boolean;
      includeCodeExamples?: boolean;
      includeMath?: boolean;
      includeInteractives?: boolean;
    } = {}
  ): Promise<EnrichedLesson> {
    const enrichedContent = {
      explanation: await Promise.all(
        lesson.content.explanation.map((section) =>
          this.enrichContent(section.content, {
            type: "explanation",
            topic: lesson.topic,
            options,
          })
        )
      ),
      practice: await Promise.all(
        lesson.content.practice.map((problem) =>
          this.enrichContent(problem.question + "\n" + problem.answer, {
            type: "practice",
            topic: lesson.topic,
            options,
          })
        )
      ),
      assessment: await Promise.all(
        lesson.content.assessment.map((item) =>
          this.enrichContent(item.question, {
            type: "assessment",
            topic: lesson.topic,
            options,
          })
        )
      ),
    };

    // Find related resources
    const relatedResources = await this.findRelatedResources(
      lesson.subject,
      lesson.topic
    );

    // Generate interactive elements
    const interactiveElements = this.generateInteractiveElements(
      lesson,
      options
    );

    return {
      ...lesson,
      enrichedContent,
      interactiveElements,
      relatedResources,
    };
  }

  /**
   * Enrich content text with embedded elements
   */
  private async enrichContent(
    content: string,
    context: {
      type: string;
      topic: string;
      options: Record<string, unknown>;
    }
  ): Promise<EnrichedContent> {
    const embedded: EmbeddedElement[] = [];
    let enrichedText = content;

    // Process mathematical expressions
    if (context.options.includeMath) {
      const mathRegex = /\$\$(.*?)\$\$|\$(.*?)\$/gs;
      const mathMatches = [...enrichedText.matchAll(mathRegex)];

      for (const match of mathMatches) {
        const mathExpr = match[1] || match[2];
        const rendered = await this.mathRenderer.render(mathExpr);
        embedded.push({
          type: "math",
          data: {
            expression: mathExpr,
            rendered,
          },
        });
      }
    }

    // Process code blocks
    if (context.options.includeCodeExamples) {
      const codeRegex =
        /```(\w*)\n([\s\S]*?)```|`([^`]+)`/g;
      const codeMatches = [...enrichedText.matchAll(codeRegex)];

      for (const match of codeMatches) {
        const language = match[1] || "text";
        const code = match[2] || match[3];
        const highlighted =
          this.syntaxHighlighter.highlight(code, language);

        embedded.push({
          type: "code",
          data: {
            code,
            language,
            highlighted,
          },
          caption: `Code snippet in ${language}`,
        });
      }
    }

    // Process image references
    if (context.options.includeVideos) {
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      const imageMatches = [...enrichedText.matchAll(imageRegex)];

      for (const match of imageMatches) {
        const alt = match[1];
        const url = match[2];

        embedded.push({
          type: "image",
          data: {
            url,
            alt,
          },
          caption: alt,
        });
      }
    }

    return {
      text: enrichedText,
      markup: "markdown",
      embedded: embedded.length > 0 ? embedded : undefined,
    };
  }

  /**
   * Find related learning resources
   */
  private async findRelatedResources(
    subject: string,
    topic: string
  ): Promise<Resource[]> {
    // Check cache
    const cacheKey = `${subject}:${topic}`;
    if (this.resourceCache.has(cacheKey)) {
      return this.resourceCache.get(cacheKey) || [];
    }

    // In production, query resource database
    const resources: Resource[] = [
      {
        id: `vid-${topic}-1`,
        title: `Understanding ${topic}`,
        description: `Video introduction to ${topic}`,
        url: `https://example.com/videos/${topic}`,
        type: "video",
        subject,
        topic,
        difficulty: "beginner",
        duration: 600,
      },
      {
        id: `art-${topic}-1`,
        title: `Deep Dive: ${topic}`,
        description: `Comprehensive article on ${topic}`,
        url: `https://example.com/articles/${topic}`,
        type: "article",
        subject,
        topic,
        difficulty: "intermediate",
      },
      {
        id: `ws-${topic}-1`,
        title: `${topic} Practice Worksheet`,
        description: `Printable worksheet for ${topic}`,
        url: `https://example.com/worksheets/${topic}`,
        type: "worksheet",
        subject,
        topic,
        difficulty: "intermediate",
      },
    ];

    // Cache results
    this.resourceCache.set(cacheKey, resources);

    return resources;
  }

  /**
   * Generate interactive learning elements
   */
  private generateInteractiveElements(
    lesson: GeneratedLesson,
    options: Record<string, unknown>
  ): InteractiveElement[] {
    const elements: InteractiveElement[] = [];

    if (options.includeInteractives) {
      // Create a concept visualization element
      elements.push({
        id: `viz-${lesson.id}-1`,
        type: "visualization",
        topic: lesson.topic,
        content: `Visualize key concepts in ${lesson.topic}`,
        difficulty: lesson.metadata.difficulty,
      });

      // Create simulation element for applicable topics
      if (
        ["physics", "chemistry", "biology"].includes(lesson.subject.toLowerCase())
      ) {
        elements.push({
          id: `sim-${lesson.id}-1`,
          type: "simulation",
          topic: lesson.topic,
          content: `Interactive simulation of ${lesson.topic}`,
          difficulty: lesson.metadata.difficulty,
        });
      }

      // Create coding challenge for computing topics
      if (
        ["computer science", "programming", "coding"].some((s) =>
          lesson.subject.toLowerCase().includes(s)
        )
      ) {
        elements.push({
          id: `code-${lesson.id}-1`,
          type: "coding-challenge",
          topic: lesson.topic,
          content: `Implement a solution related to ${lesson.topic}`,
          difficulty: "intermediate",
        });
      }

      // Create comprehensive quiz
      elements.push({
        id: `quiz-${lesson.id}-1`,
        type: "quiz",
        topic: lesson.topic,
        content: `Test your understanding of ${lesson.topic}`,
        difficulty: lesson.metadata.difficulty,
      });
    }

    return elements;
  }

  /**
   * Convert enriched content to HTML for display
   */
  renderToHTML(content: EnrichedContent): string {
    let html = this.markdownToHtml(content.text);

    if (content.embedded) {
      for (const element of content.embedded) {
        const elementHtml = this.renderElement(element);
        html += `\n${elementHtml}\n`;
      }
    }

    return html;
  }

  /**
   * Render individual embedded element
   */
  private renderElement(element: EmbeddedElement): string {
    switch (element.type) {
      case "image":
        return `<figure class="figure"><img src="${element.data.url}" alt="${element.data.alt}" /><figcaption>${element.caption || ""}</figcaption></figure>`;

      case "video":
        return `<div class="video-container"><video controls><source src="${element.data.url}" type="video/mp4" /></video><p>${element.caption || ""}</p></div>`;

      case "code":
        return `<div class="code-block" data-language="${element.data.language}"><pre><code>${element.data.highlighted}</code></pre></div>`;

      case "math":
        return `<div class="math-block">${element.data.rendered}</div>`;

      case "interactive":
        return `<div class="interactive-element" data-type="${element.data.type}">Interactive: ${element.caption}</div>`;

      default:
        return "";
    }
  }

  /**
   * Simple markdown to HTML converter
   */
  private markdownToHtml(markdown: string): string {
    let html = markdown;

    // Headers
    html = html.replace(/^### (.*?)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.*?)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.*?)$/gm, "<h1>$1</h1>");

    // Bold and italic
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.*?)_/g, "<em>$1</em>");

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

    // Lists
    html = html.replace(/\n- (.*?)(?=\n|$)/g, "<li>$1</li>");
    html = html.replace(/(<li>.*?<\/li>)/s, "<ul>$1</ul>");

    // Paragraphs
    html = html.replace(/\n\n/g, "</p><p>");
    html = `<p>${html}</p>`;

    return html;
  }

  /**
   * Clear resource cache
   */
  clearCache(): void {
    this.resourceCache.clear();
  }
}

/**
 * Syntax Highlighter - Add color coding to code blocks
 */
class SyntaxHighlighter {
  highlight(code: string, language: string): string {
    // In production, use a library like Highlight.js
    // For now, return escaped code
    return this.escapeHtml(code);
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

/**
 * Math Renderer - Convert LaTeX to displayable math
 */
class MathRenderer {
  async render(expression: string): Promise<string> {
    // In production, use KaTeX or MathJax
    // For now, return expression wrapped in math tags
    return `<math>${expression}</math>`;
  }
}

export { SyntaxHighlighter, MathRenderer };
