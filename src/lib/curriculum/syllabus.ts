export type CurriculumBoard = 'cambridge';
export type CurriculumLevel = 'IGCSE' | 'AS' | 'A_LEVEL' | 'A_LEVEL_FULL';

export interface SyllabusSource {
  id: string;
  title: string;
  url: string;
  examYears: string;
  retrievedAt: string;
  publisher: string;
}

export interface SyllabusTopic {
  id: string;
  code: string;
  title: string;
  depth: number;
  parentId?: string;
  description?: string;
  learningOutcomes?: string[];
  commandWords?: string[];
  practical?: boolean;
  assessmentObjective?: string[];
  prerequisites?: string[];
}

export interface SyllabusPaper {
  code: string;
  title: string;
  durationMinutes?: number;
  marks?: number;
  assessmentObjectives?: string[];
  skills?: string[];
}

export interface SyllabusDefinition {
  board: CurriculumBoard;
  qualificationCode: string;
  qualificationName: string;
  level: CurriculumLevel;
  syllabusYear: string;
  subject: string;
  source: SyllabusSource;
  topics: SyllabusTopic[];
  papers?: SyllabusPaper[];
  version: 1;
}

export interface SyllabusContext {
  syllabus: SyllabusDefinition;
  topic: SyllabusTopic;
  ancestors: SyllabusTopic[];
  relatedTopics: SyllabusTopic[];
}

export function findSyllabusTopic(syllabus: SyllabusDefinition, query: string): SyllabusTopic | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return syllabus.topics.find(t => t.code.toLowerCase() === q)
    ?? syllabus.topics.find(t => t.title.toLowerCase() === q)
    ?? syllabus.topics.find(t => t.title.toLowerCase().includes(q));
}

export function getSyllabusContext(syllabus: SyllabusDefinition, topicId: string): SyllabusContext | undefined {
  const topic = syllabus.topics.find(t => t.id === topicId);
  if (!topic) return undefined;
  const ancestors: SyllabusTopic[] = [];
  let parent = topic.parentId;
  while (parent) {
    const found = syllabus.topics.find(t => t.id === parent);
    if (!found) break;
    ancestors.unshift(found);
    parent = found.parentId;
  }
  return { syllabus, topic, ancestors, relatedTopics: syllabus.topics.filter(t => t.parentId === topic.parentId && t.id !== topic.id).slice(0, 8) };
}

export function syllabusPromptContext(context: SyllabusContext): string {
  const { syllabus, topic, ancestors } = context;
  return [
    `Board: ${syllabus.board}`,
    `Qualification: ${syllabus.qualificationName} (${syllabus.qualificationCode})`,
    `Syllabus year: ${syllabus.syllabusYear}`,
    `Subject: ${syllabus.subject}`,
    `Syllabus topic: ${[...ancestors, topic].map(t => `${t.code} ${t.title}`).join(' > ')}`,
    topic.description ? `Official scope: ${topic.description}` : '',
    topic.learningOutcomes?.length ? `Learning outcomes:\n- ${topic.learningOutcomes.join('\n- ')}` : '',
    topic.commandWords?.length ? `Relevant command words: ${topic.commandWords.join(', ')}` : '',
    topic.assessmentObjective?.length ? `Assessment objectives: ${topic.assessmentObjective.join(', ')}` : '',
    topic.prerequisites?.length ? `Prerequisites: ${topic.prerequisites.join(', ')}` : '',
  ].filter(Boolean).join('\n');
}
