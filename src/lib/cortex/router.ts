/**
 * /lib/cortex/router.ts
 * 
 * Cortex Router: Intelligent question routing + memory management
 * 
 * Responsibility:
 * - Route questions to appropriate AI provider (simple → local, complex → teacher)
 * - Check memory for cached responses
 * - Save all interactions to memory
 * - Return structured response with source metadata
 * 
 * This is the core intelligence dispatcher for Cortex v1.
 */

import { CortexMemory } from "./memory";
import { TeacherAI } from "./teacher";
import { LocalModel } from "./localModel";

/**
 * Routing decision: determines complexity and target provider
 */
interface RoutingDecision {
  isComplex: boolean;
  confidence: number;
  reason: string;
}

/**
 * Structured response from router
 */
export interface CortexRouterResponse {
  source: "memory" | "local" | "teacher";
  answer: string;
  timestamp: string;
  metadata?: {
    complexity: "simple" | "complex";
    confidence: number;
    routingReason: string;
  };
}

/**
 * Request payload for router
 */
export interface CortexRouterRequest {
  userId: string;
  question: string;
  context?: Record<string, unknown>;
}

/**
 * CortexRouter: Main intelligence dispatcher
 * 
 * Flow:
 * 1. Check memory (fast retrieval)
 * 2. Decide routing (simple vs complex)
 * 3. Call appropriate provider (LocalModel vs TeacherAI)
 * 4. Save to memory
 * 5. Return structured response
 */
export class CortexRouter {
  private memory: CortexMemory;
  private teacher: TeacherAI;
  private localModel: LocalModel;

  constructor() {
    this.memory = new CortexMemory();
    this.teacher = new TeacherAI();
    this.localModel = new LocalModel();
  }

  /**
   * Main handler: routes question through Cortex decision pipeline
   */
  async handle(request: CortexRouterRequest): Promise<CortexRouterResponse> {
    const { userId, question } = request;

    // 1️⃣ CHECK MEMORY FIRST (fast retrieval)
    const cachedAnswer = this.memory.retrieve(userId, question);
    if (cachedAnswer) {
      return {
        source: "memory",
        answer: cachedAnswer,
        timestamp: new Date().toISOString(),
        metadata: {
          complexity: "simple",
          confidence: 1.0,
          routingReason: "Retrieved from memory cache",
        },
      };
    }

    // 2️⃣ DECIDE ROUTING (simple heuristic-based logic)
    const routingDecision = this.decideRoute(question);

    let answer: string;
    let provider: "local" | "teacher";

    if (routingDecision.isComplex) {
      // 3️⃣ CALL TEACHER AI FOR COMPLEX QUESTIONS
      provider = "teacher";
      answer = await this.teacher.generateResponse(question, request.context);
    } else {
      // 3️⃣ CALL LOCAL MODEL FOR SIMPLE QUESTIONS
      provider = "local";
      answer = await this.localModel.generateResponse(question, request.context);
    }

    // 4️⃣ SAVE TO MEMORY
    this.memory.save(userId, question, answer);

    // 5️⃣ RETURN STRUCTURED RESPONSE
    return {
      source: provider,
      answer,
      timestamp: new Date().toISOString(),
      metadata: {
        complexity: routingDecision.isComplex ? "complex" : "simple",
        confidence: routingDecision.confidence,
        routingReason: routingDecision.reason,
      },
    };
  }

  /**
   * Routing Decision Logic: Heuristic-based complexity detection
   * 
   * Simple questions → LocalModel (fast, deterministic)
   * Complex questions → TeacherAI (nuanced, contextual)
   * 
   * Heuristics:
   * - Question length > 100 chars: likely complex
   * - Multi-part questions: complex
   * - Abstract/conceptual keywords: complex
   * - Specific facts/definitions: simple
   */
  private decideRoute(question: string): RoutingDecision {
    const lowerQuestion = question.toLowerCase().trim();
    const wordCount = lowerQuestion.split(/\s+/).length;
    const charCount = question.length;

    // Complexity indicators
    const complexKeywords = [
      "why",
      "how",
      "explain",
      "describe",
      "analyze",
      "compare",
      "contrast",
      "evaluate",
      "discuss",
      "interpret",
      "relationship",
      "connection",
      "implication",
      "consequence",
    ];

    const simpleKeywords = [
      "what is",
      "define",
      "list",
      "who is",
      "when was",
      "where is",
      "how many",
      "what time",
    ];

    let complexScore = 0;
    let simpleScore = 0;

    // Check for keyword patterns
    complexKeywords.forEach((keyword) => {
      if (lowerQuestion.includes(keyword)) {
        complexScore += 1;
      }
    });

    simpleKeywords.forEach((keyword) => {
      if (lowerQuestion.includes(keyword)) {
        simpleScore += 1;
      }
    });

    // Length heuristic: longer questions tend to be more complex
    if (charCount > 100) {
      complexScore += 0.5;
    } else if (charCount < 30) {
      simpleScore += 0.5;
    }

    // Multi-part questions (contains multiple ? or "and/or")
    const questionMarks = (question.match(/\?/g) || []).length;
    if (questionMarks > 1) {
      complexScore += 1;
    }

    if (lowerQuestion.includes(" and ") || lowerQuestion.includes(" or ")) {
      complexScore += 0.5;
    }

    // Word count: longer is generally more complex
    if (wordCount > 20) {
      complexScore += 0.5;
    }

    // Decide
    const isComplex = complexScore > simpleScore;
    const confidence = Math.min(
      Math.abs(complexScore - simpleScore) / Math.max(complexScore, simpleScore, 1),
      1.0
    );

    return {
      isComplex,
      confidence,
      reason: isComplex
        ? `High complexity indicators detected (score: ${complexScore})`
        : `High simplicity indicators detected (score: ${simpleScore})`,
    };
  }

  /**
   * Get memory stats for debugging
   */
  getMemoryStats() {
    return this.memory.getStats();
  }

  /**
   * Clear memory for a user (testing/cleanup)
   */
  clearMemory(userId: string) {
    this.memory.clearUser(userId);
  }
}

/**
 * Default singleton instance
 */
export const cortexRouter = new CortexRouter();
