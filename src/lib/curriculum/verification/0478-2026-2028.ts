import type { CurriculumKnowledgeKind } from "../knowledge";

export const CAMBRIDGE_0478_2026_2028_REQUIRED_KINDS: CurriculumKnowledgeKind[] = [
  "topic",
  "content_scope",
  "competency",
  "skill",
  "progression",
  "assessment_requirement",
  "paper_component",
  "assessment_weighting",
  "examination_format",
  "practical_activity",
  "terminology",
  "constraint",
  "guidance",
  "resource",
];

export const CAMBRIDGE_0478_2026_2028_TOPICS = [
  "data-representation",
  "data-transmission",
  "hardware",
  "software",
  "internet-and-its-uses",
  "automated-and-emerging-technologies",
  "algorithm-design-and-problem-solving",
  "programming",
  "databases",
  "boolean-logic",
] as const;

export const CAMBRIDGE_0478_2026_2028_ASSESSMENT = {
  paper1: {
    title: "Computer Systems",
    marks: 75,
    durationMinutes: 105,
    weightingPercent: 50,
    topics: ["1-6"],
    calculators: false,
    externallyAssessed: true,
  },
  paper2: {
    title: "Algorithms, Programming and Logic",
    marks: 75,
    durationMinutes: 105,
    weightingPercent: 50,
    topics: ["7-10"],
    calculators: false,
    externallyAssessed: true,
  },
  assessmentObjectives: { AO1: 40, AO2: 40, AO3: 20 },
} as const;

export const CAMBRIDGE_0478_2026_2028_DOCUMENT = {
  syllabusId: "0478",
  syllabusVersion: "2026-2028",
  qualification: "Cambridge IGCSE",
  subject: "Computer Science",
  officialUrl: "https://www.cambridgeinternational.org/Images/697167-2026-2028-syllabus.pdf",
  version: 5,
  pageCount: 56,
} as const;
