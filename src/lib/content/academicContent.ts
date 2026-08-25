import type { StructuredDiagram } from '@/lib/diagrams/types';

export type AcademicContentBlock =
  | { type: 'heading'; id: string; text: string; level: 1 | 2 | 3 }
  | { type: 'rich_text'; id: string; markdown: string }
  | { type: 'equation'; id: string; latex: string; explanation?: string }
  | { type: 'example'; id: string; question: string; solution: string; steps?: string[] }
  | { type: 'misconception'; id: string; misconception: string; correction: string }
  | { type: 'diagram'; id: string; diagram: StructuredDiagram; caption?: string; altText: string }
  | { type: 'retrieval'; id: string; prompt: string; answer: string; marks?: number }
  | { type: 'application'; id: string; prompt: string; expectedSkills?: string[] }
  | { type: 'exam_tip'; id: string; text: string; commandWord?: string }
  | { type: 'curiosity'; id: string; prompt: string; explanation?: string }
  | { type: 'callout'; id: string; tone: 'info' | 'warning' | 'key'; title: string; body: string };

export interface AcademicContentDocument {
  id: string;
  title: string;
  subject: string;
  blocks: AcademicContentBlock[];
  context: {
    stage: string;
    board: string;
    qualification: string;
    syllabusCode?: string;
    syllabusYear?: string;
  };
  source: 'generated' | 'imported' | 'teacher' | 'learner';
  generationVersion?: string;
}

export function contentHasDiagram(document: AcademicContentDocument): boolean {
  return document.blocks.some(block => block.type === 'diagram');
}

export function contentHasRetrieval(document: AcademicContentDocument): boolean {
  return document.blocks.some(block => block.type === 'retrieval');
}
