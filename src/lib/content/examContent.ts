import type { StructuredDiagram } from '@/lib/diagrams/types';

export interface AcademicExamQuestion {
  id: string;
  number: number;
  prompt: string;
  marks: number;
  diagram?: { diagram: StructuredDiagram; caption?: string; altText: string };
  commandWord?: string;
  assessmentObjective?: string;
  syllabusOutcome?: string;
  expectedAnswer?: string;
  markingPoints?: string[];
  responseType: 'short_answer' | 'structured' | 'calculation' | 'essay' | 'multiple_choice' | 'diagram_annotation';
}

export interface AcademicExamDocument {
  id: string;
  title: string;
  subject: string;
  questions: AcademicExamQuestion[];
  context: {
    stage: string;
    board: string;
    qualification: string;
    syllabusCode?: string;
    syllabusYear?: string;
  };
  source: 'generated' | 'imported' | 'teacher';
  generationVersion?: string;
}

export function totalMarks(exam: AcademicExamDocument): number {
  return exam.questions.reduce((sum, question) => sum + question.marks, 0);
}

export function questionsWithDiagrams(exam: AcademicExamDocument): AcademicExamQuestion[] {
  return exam.questions.filter(question => Boolean(question.diagram));
}
