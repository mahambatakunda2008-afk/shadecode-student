import type { StructuredDiagram } from "./diagram";

export type SourceReference = { sourceId: string; page?: number; section?: string; quote?: string };

export type ContentBlock =
  | { type: "prose"; id: string; text: string; sources?: SourceReference[] }
  | { type: "equation"; id: string; latex: string; explanation?: string }
  | { type: "code"; id: string; language: string; code: string }
  | { type: "table"; id: string; headers: string[]; rows: string[][] }
  | { type: "diagram"; id: string; diagram: StructuredDiagram }
  | { type: "image"; id: string; src: string; alt: string; caption?: string }
  | { type: "question"; id: string; questionId: string }
  | { type: "worked_solution"; id: string; steps: string[] }
  | { type: "callout"; id: string; tone: "info" | "warning" | "tip" | "curiosity"; title: string; text: string }
  | { type: "interactive"; id: string; kind: string; payload: Record<string, unknown> };

export function contentBlockId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
