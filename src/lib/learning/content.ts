export type LearningContentBlock =
  | { type: 'prose'; id: string; markdown: string }
  | { type: 'equation'; id: string; latex: string; label?: string }
  | { type: 'code'; id: string; language: string; code: string }
  | { type: 'table'; id: string; columns: string[]; rows: string[][] }
  | { type: 'diagram'; id: string; diagram: DiagramSpec }
  | { type: 'question'; id: string; question: LearningQuestion }
  | { type: 'worked_solution'; id: string; title?: string; steps: SolutionStep[] }
  | { type: 'callout'; id: string; tone: 'info' | 'tip' | 'warning' | 'curiosity'; title: string; body: string }
  | { type: 'interactive'; id: string; kind: string; data: Record<string, unknown> };

export type DiagramType =
  | 'free_body'
  | 'circuit'
  | 'graph'
  | 'timeline'
  | 'flow'
  | 'geometry'
  | 'molecular'
  | 'algorithm'
  | 'architecture'
  | 'data'
  | 'custom';

export interface DiagramPoint { x: number; y: number }
export interface DiagramNode { id: string; x: number; y: number; label?: string; kind?: string }
export interface DiagramEdge { id: string; from: string; to: string; label?: string; arrow?: boolean }

export interface DiagramSpec {
  version: 1;
  type: DiagramType;
  width: number;
  height: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  labels?: { id: string; text: string; x: number; y: number }[];
  annotations?: { id: string; text: string; x: number; y: number }[];
  equations?: { id: string; latex: string; x: number; y: number }[];
  caption?: string;
  altText: string;
  interactive?: boolean;
}

export interface LearningQuestion {
  stem: string;
  commandVerb?: string;
  marks: number;
  options?: string[];
  answer?: string;
  diagram?: DiagramSpec;
  skillTags: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export interface SolutionStep { text: string; equation?: string; diagram?: DiagramSpec }

export interface LessonCoverage {
  definitions: number;
  principles: number;
  relationships: number;
  prerequisites: number;
  applications: number;
  examples: number;
  misconceptions: number;
  practicalContext: number;
  examSkills: number;
  transfer: number;
  curiosity: number;
}

export interface LearningLesson {
  version: 1;
  id: string;
  title: string;
  subject: string;
  level?: string;
  learningPromise: string;
  blocks: LearningContentBlock[];
  coverage: LessonCoverage;
  sourceRefs?: SourceReference[];
}

export interface SourceReference {
  sourceId: string;
  title: string;
  locator?: string;
  page?: number;
  section?: string;
}

export function validateDiagramSpec(diagram: DiagramSpec): string[] {
  const errors: string[] = [];
  if (diagram.version !== 1) errors.push('Unsupported diagram version');
  if (!Number.isFinite(diagram.width) || diagram.width <= 0) errors.push('Invalid diagram width');
  if (!Number.isFinite(diagram.height) || diagram.height <= 0) errors.push('Invalid diagram height');
  if (!diagram.altText.trim()) errors.push('Diagram alt text is required');
  const ids = new Set<string>();
  for (const node of diagram.nodes) {
    if (ids.has(node.id)) errors.push(`Duplicate diagram node id: ${node.id}`);
    ids.add(node.id);
  }
  for (const edge of diagram.edges) {
    if (!ids.has(edge.from)) errors.push(`Unknown edge source: ${edge.from}`);
    if (!ids.has(edge.to)) errors.push(`Unknown edge target: ${edge.to}`);
  }
  return errors;
}
