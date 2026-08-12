/**
 * /lib/cortex/router.ts
 *
 * Cortex Router: intelligent question routing + memory management.
 *
 * The production default remains LocalModel. The compact local engine can be
 * enabled explicitly for benchmark/edge experiments without changing normal
 * learning behaviour.
 */

import { CortexMemory } from "./memory";
import { TeacherAI } from "./teacher";
import { LocalModel } from "./localModel";
import { CompactLocalModel } from "./compactLocalModel";

interface RoutingDecision {
  isComplex: boolean;
  confidence: number;
  reason: string;
}

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

export interface CortexRouterRequest {
  userId: string;
  question: string;
  context?: Record<string, unknown>;
}

export interface CortexRouterOptions {
  /**
   * Experimental edge path. Off by default so production continues to use
   * the established LocalModel until the compact candidate proves useful.
   */
  useCompactLocalModel?: boolean;
}

export class CortexRouter {
  private memory: CortexMemory;
  private teacher: TeacherAI;
  private localModel: LocalModel;
  private compactLocalModel: CompactLocalModel;
  private readonly useCompactLocalModel: boolean;

  constructor(options: CortexRouterOptions = {}) {
    this.memory = new CortexMemory();
    this.teacher = new TeacherAI();
    this.localModel = new LocalModel();
    this.compactLocalModel = new CompactLocalModel();
    this.useCompactLocalModel = options.useCompactLocalModel === true;
  }

  async handle(request: CortexRouterRequest): Promise<CortexRouterResponse> {
    const { userId, question } = request;

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

    const routingDecision = this.decideRoute(question);

    let answer: string;
    let provider: "local" | "teacher";

    if (routingDecision.isComplex) {
      provider = "teacher";
      answer = await this.teacher.generateResponse(question, request.context);
    } else if (this.useCompactLocalModel) {
      provider = "local";
      answer = this.compactLocalModel.infer(question).answer;
    } else {
      provider = "local";
      answer = await this.localModel.generateResponse(question, request.context);
    }

    this.memory.save(userId, question, answer);

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

  private decideRoute(question: string): RoutingDecision {
    const lowerQuestion = question.toLowerCase().trim();
    const wordCount = lowerQuestion.split(/\s+/).length;
    const charCount = question.length;

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

    complexKeywords.forEach((keyword) => {
      if (lowerQuestion.includes(keyword)) complexScore += 1;
    });

    simpleKeywords.forEach((keyword) => {
      if (lowerQuestion.includes(keyword)) simpleScore += 1;
    });

    if (charCount > 100) complexScore += 0.5;
    else if (charCount < 30) simpleScore += 0.5;

    const questionMarks = (question.match(/\?/g) || []).length;
    if (questionMarks > 1) complexScore += 1;

    if (lowerQuestion.includes(" and ") || lowerQuestion.includes(" or ")) {
      complexScore += 0.5;
    }

    if (wordCount > 20) complexScore += 0.5;

    const isComplex = complexScore > simpleScore;
    const confidence = Math.min(
      Math.abs(complexScore - simpleScore) / Math.max(complexScore, simpleScore, 1),
      1.0,
    );

    return {
      isComplex,
      confidence,
      reason: isComplex
        ? `High complexity indicators detected (score: ${complexScore})`
        : `High simplicity indicators detected (score: ${simpleScore})`,
    };
  }

  getMemoryStats() {
    return this.memory.getStats();
  }

  clearMemory(userId: string) {
    this.memory.clearUser(userId);
  }
}

export const cortexRouter = new CortexRouter();
