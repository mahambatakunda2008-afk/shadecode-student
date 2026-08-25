/** Diagram-native content contract shared by lessons, exams and canvas. */

export type DiagramType =
  | "free_body" | "circuit" | "graph" | "timeline" | "flow" | "geometry"
  | "molecular" | "algorithm" | "architecture" | "data" | "custom";

export interface DiagramPoint { x: number; y: number }
export interface DiagramNode { id: string; x: number; y: number; label?: string; shape?: "circle" | "rect" | "text" | "point" }
export interface DiagramEdge { id: string; from: string; to: string; directed?: boolean; label?: string; kind?: "line" | "arrow" | "curve" }
export interface DiagramAnnotation { id: string; x: number; y: number; text: string; anchor?: "start" | "middle" | "end" }

export interface StructuredDiagram {
  id: string;
  type: DiagramType;
  width: number;
  height: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  annotations: DiagramAnnotation[];
  equations?: string[];
  caption?: string;
  altText: string;
  interactive?: boolean;
  version: 1;
}

export function createDiagram(type: DiagramType, altText: string, width = 800, height = 500): StructuredDiagram {
  return { id: `diagram-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type, width, height, nodes: [], edges: [], annotations: [], altText, interactive: false, version: 1 };
}

export function validateDiagram(diagram: StructuredDiagram): string[] {
  const errors: string[] = [];
  if (!diagram.id) errors.push("Diagram id is required");
  if (!diagram.altText.trim()) errors.push("Accessible alt text is required");
  if (diagram.width <= 0 || diagram.height <= 0) errors.push("Diagram dimensions must be positive");
  const nodeIds = new Set(diagram.nodes.map((n) => n.id));
  diagram.edges.forEach((e) => {
    if (!nodeIds.has(e.from)) errors.push(`Edge ${e.id} references missing node ${e.from}`);
    if (!nodeIds.has(e.to)) errors.push(`Edge ${e.id} references missing node ${e.to}`);
  });
  return errors;
}
