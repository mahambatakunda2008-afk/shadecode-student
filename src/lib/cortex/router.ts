/** Cortex Router: device-first memory, optional compact local inference, then resilient TeacherAI. */
import { CortexMemory } from "./memory";
import { TeacherAI } from "./teacher";
import { CompactLocalModel } from "./compactLocalModel";
import { listLocalCortexInteractions, saveLocalCortexInteraction } from "@/lib/local-first/cortex-interactions";

interface RoutingDecision { isComplex: boolean; confidence: number; reason: string; }
export interface CortexRouterResponse { source: "memory" | "local" | "teacher"; answer: string; timestamp: string; metadata?: { complexity: "simple" | "complex"; confidence: number; routingReason: string }; }
export interface CortexRouterRequest { userId: string; question: string; context?: Record<string, unknown>; }
export interface CortexRouterOptions { useCompactLocalModel?: boolean; }

export class CortexRouter {
  private memory = new CortexMemory();
  private teacher = new TeacherAI();
  private compactLocalModel = new CompactLocalModel();
  private readonly useCompactLocalModel: boolean;
  private hydratedUsers = new Set<string>();

  constructor(options: CortexRouterOptions = {}) { this.useCompactLocalModel = options.useCompactLocalModel === true; }

  async handle(request: CortexRouterRequest): Promise<CortexRouterResponse> {
    const { userId, question } = request;
    if (!userId?.trim()) throw new Error("Cortex requires an authenticated user");
    await this.hydrateUserMemory(userId);
    const cachedAnswer = this.memory.retrieve(userId, question);
    if (cachedAnswer) return { source: "memory", answer: cachedAnswer, timestamp: new Date().toISOString(), metadata: { complexity: "simple", confidence: 1, routingReason: "Retrieved from device memory" } };

    const routingDecision = this.decideRoute(question);
    let answer: string;
    let source: "local" | "teacher";
    if (this.useCompactLocalModel) {
      source = "local";
      answer = this.compactLocalModel.infer(question).answer;
    } else {
      source = "teacher";
      answer = await this.teacher.generateResponse(question, request.context, userId);
    }

    const timestamp = new Date().toISOString();
    const entry = { userId, question: question.trim(), answer: answer.trim(), timestamp };
    this.memory.save(userId, entry.question, entry.answer);
    void saveLocalCortexInteraction(userId, entry).catch(() => undefined);
    return { source, answer, timestamp, metadata: { complexity: routingDecision.isComplex ? "complex" : "simple", confidence: routingDecision.confidence, routingReason: routingDecision.reason } };
  }

  private async hydrateUserMemory(userId: string): Promise<void> {
    if (this.hydratedUsers.has(userId)) return;
    const entries = await listLocalCortexInteractions(userId);
    for (const entry of entries.reverse()) this.memory.save(userId, entry.question, entry.answer);
    this.hydratedUsers.add(userId);
  }

  private decideRoute(question: string): RoutingDecision {
    const lower = question.toLowerCase().trim();
    const wordCount = lower.split(/\s+/).filter(Boolean).length;
    let complexScore = 0;
    let simpleScore = 0;
    ["why", "how", "explain", "describe", "analyze", "compare", "contrast", "evaluate", "discuss", "interpret", "relationship", "connection", "implication", "consequence"].forEach(k => { if (lower.includes(k)) complexScore += 1; });
    ["what is", "define", "list", "who is", "when was", "where is", "how many", "what time"].forEach(k => { if (lower.includes(k)) simpleScore += 1; });
    if (question.length > 100) complexScore += 0.5; else if (question.length < 30) simpleScore += 0.5;
    if ((question.match(/\?/g) || []).length > 1) complexScore += 1;
    if (lower.includes(" and ") || lower.includes(" or ")) complexScore += 0.5;
    if (wordCount > 20) complexScore += 0.5;
    const isComplex = complexScore > simpleScore;
    const confidence = Math.min(Math.abs(complexScore - simpleScore) / Math.max(complexScore, simpleScore, 1), 1);
    return { isComplex, confidence, reason: isComplex ? `High complexity indicators detected (score: ${complexScore})` : `High simplicity indicators detected (score: ${simpleScore})` };
  }

  getMemoryStats() { return this.memory.getStats(); }
  clearMemory(userId: string) { this.memory.clearUser(userId); this.hydratedUsers.delete(userId); }
}

export const cortexRouter = new CortexRouter();
