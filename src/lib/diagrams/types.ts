export type DiagramKind = 'freeform' | 'geometry' | 'graph' | 'physics' | 'chemistry' | 'biology' | 'flowchart' | 'circuit';
export type DiagramPrimitive = 'line' | 'polyline' | 'curve' | 'circle' | 'rectangle' | 'arrow' | 'text' | 'point' | 'path';

export interface DiagramPoint { x: number; y: number; }

export interface DiagramElement {
  id: string;
  primitive: DiagramPrimitive;
  points: DiagramPoint[];
  label?: string;
  rotation?: number;
  locked?: boolean;
  metadata?: Record<string, string | number | boolean>;
}

export interface StructuredDiagram {
  id: string;
  kind: DiagramKind;
  width: number;
  height: number;
  elements: DiagramElement[];
  accessibilityDescription?: string;
  source: 'learner' | 'generated' | 'imported';
}
