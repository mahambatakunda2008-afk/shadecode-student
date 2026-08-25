import type { DiagramKind, StructuredDiagram } from './types';

export type DiagramRequirement = 'optional' | 'recommended' | 'required';

export interface GeneratedDiagramSpec {
  kind: DiagramKind;
  requirement: DiagramRequirement;
  purpose: string;
  accessibilityDescription: string;
  generationHints?: string[];
}

export interface DiagramGenerationPolicy {
  lesson: GeneratedDiagramSpec[];
  exam: GeneratedDiagramSpec[];
}

export interface DiagramGenerationResult {
  diagram: StructuredDiagram;
  caption?: string;
  altText: string;
  questionOrSectionId?: string;
}

export function shouldGenerateDiagram(spec: GeneratedDiagramSpec, confidence: number): boolean {
  if (spec.requirement === 'required') return true;
  if (spec.requirement === 'recommended') return confidence >= 0.55;
  return confidence >= 0.82;
}

export function buildDiagramInstruction(spec: GeneratedDiagramSpec): string {
  return [
    `Diagram kind: ${spec.kind}`,
    `Purpose: ${spec.purpose}`,
    `Accessibility description: ${spec.accessibilityDescription}`,
    ...(spec.generationHints ?? []),
    'Return structured editable diagram primitives, not a raster image.',
    'Keep labels legible, geometry internally consistent, and avoid decorative elements that add no instructional value.',
  ].join('\n');
}
