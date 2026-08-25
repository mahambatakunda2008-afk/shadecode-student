export type EducationStage = 'primary' | 'lower_secondary' | 'upper_secondary' | 'advanced_secondary' | 'tertiary';
export type CurriculumBoard = 'cambridge' | 'zimsec' | 'pearson_edexcel' | 'aqa' | 'ocr' | 'ib' | 'waec' | 'custom';

export interface CurriculumSource {
  id: string;
  board: CurriculumBoard;
  qualification: string;
  subject: string;
  syllabusCode?: string;
  syllabusYear: string;
  stage: EducationStage;
  officialUrl: string;
  retrievedAt?: string;
}

export interface CurriculumNode {
  id: string;
  code?: string;
  title: string;
  stage: EducationStage;
  subject: string;
  parentId?: string;
  description?: string;
  learningOutcomes: string[];
  commandWords?: string[];
  assessmentObjectives?: string[];
  practicalSkills?: string[];
  prerequisites?: string[];
  tags?: string[];
  sourceId: string;
  syllabusYear: string;
  version: number;
}

export interface CurriculumCatalog {
  version: number;
  generatedAt: string;
  sources: CurriculumSource[];
  nodes: CurriculumNode[];
}

export const CAMBRIDGE_SOURCES: CurriculumSource[] = [
  { id: 'cambridge-9702-2027', board: 'cambridge', qualification: 'AS & A Level Physics', subject: 'Physics', syllabusCode: '9702', syllabusYear: '2025-2027', stage: 'advanced_secondary', officialUrl: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-physics-9702/' },
  { id: 'cambridge-9709-2027', board: 'cambridge', qualification: 'AS & A Level Mathematics', subject: 'Mathematics', syllabusCode: '9709', syllabusYear: '2026-2027', stage: 'advanced_secondary', officialUrl: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/' },
  { id: 'cambridge-9618-2029', board: 'cambridge', qualification: 'AS & A Level Computer Science', subject: 'Computer Science', syllabusCode: '9618', syllabusYear: '2027-2029', stage: 'advanced_secondary', officialUrl: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-computer-science-9618/' },
  { id: 'cambridge-9701-2027', board: 'cambridge', qualification: 'AS & A Level Chemistry', subject: 'Chemistry', syllabusCode: '9701', syllabusYear: '2025-2027', stage: 'advanced_secondary', officialUrl: 'https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-chemistry-9701/' },
];

export function resolveCurriculumNode(catalog: CurriculumCatalog, input: { board?: CurriculumBoard; syllabusCode?: string; subject?: string; syllabusYear?: string; topic?: string }) {
  const normalizedTopic = input.topic?.trim().toLowerCase();
  return catalog.nodes.find((node) =>
    (!input.board || catalog.sources.find(s => s.id === node.sourceId)?.board === input.board) &&
    (!input.syllabusCode || catalog.sources.find(s => s.id === node.sourceId)?.syllabusCode === input.syllabusCode) &&
    (!input.subject || node.subject.toLowerCase() === input.subject.trim().toLowerCase()) &&
    (!input.syllabusYear || node.syllabusYear === input.syllabusYear) &&
    (!normalizedTopic || node.title.toLowerCase() === normalizedTopic || node.id.toLowerCase() === normalizedTopic)
  ) ?? null;
}
