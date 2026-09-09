import type { CurriculumExtractionProfile } from "./knowledge-extraction";

const COMMON_HEADINGS = [
  "syllabus content",
  "content overview",
  "content",
  "topics",
  "assessment",
  "assessment objectives",
  "examination format",
  "paper structure",
  "practical activities",
  "project requirements",
  "learning outcomes",
  "learning objectives",
  "competencies",
  "prerequisites",
  "progression",
  "terminology",
  "definitions",
  "resources",
  "guidance",
  "notes",
  "constraints",
];

const COMMON_ASSESSMENT_PATTERNS = [
  /assessment/i,
  /examination/i,
  /paper\s+(?:\d+|one|two|three|four)/i,
  /practical\s+(?:examination|assessment|paper)/i,
  /coursework/i,
  /school[- ]based assessment/i,
  /internal assessment/i,
];

const COMMON_PAPER_PATTERNS = [
  /paper\s+(?:\d+|one|two|three|four)/i,
  /component\s+(?:\d+|one|two|three|four)/i,
  /coursework/i,
  /practical\s+(?:paper|component)/i,
];

export const CURRICULUM_EXTRACTION_PROFILES: Record<string, CurriculumExtractionProfile> = {
  "zimsec-syllabi": {
    topicHeadings: [
      ...COMMON_HEADINGS,
      "hardware and software",
      "application of computer science",
      "data representation",
      "communication networks and the internet",
      "security and ethics",
      "systems analysis and design",
      "algorithm design and problem solving",
      "programming",
      "databases",
      "web design",
      "technopreneurship",
    ],
    sectionKinds: {
      "syllabus content": "content_scope",
      "assessment objectives": "assessment_requirement",
      assessment: "assessment_requirement",
      "paper structure": "paper_component",
      "examination format": "examination_format",
      "practical activities": "practical_activity",
      "project requirements": "project_requirement",
    },
    objectiveCodePattern: "^(?:4\\.(?:[1-9]|10)|8\\.(?:1[2-9]|2[0-9]|3[0-9]|4[0-4]))$",
    assessmentPatterns: COMMON_ASSESSMENT_PATTERNS,
    paperPatterns: COMMON_PAPER_PATTERNS,
  },

  // Cambridge syllabus documents are intentionally conservative here. Their
  // numbered content sections are not automatically objectives. A future
  // board-specific profile can add verified objective/learning-outcome codes.
  "cambridge-igcse-computer-science-0478": {
    topicHeadings: COMMON_HEADINGS,
    sectionKinds: {
      "syllabus content": "content_scope",
      assessment: "assessment_requirement",
      "assessment objectives": "assessment_requirement",
      "examination format": "examination_format",
      "paper structure": "paper_component",
      "learning objectives": "learning_outcome",
    },
    assessmentPatterns: COMMON_ASSESSMENT_PATTERNS,
    paperPatterns: COMMON_PAPER_PATTERNS,
  },

  "cambridge-o-level-computer-science-2210": {
    topicHeadings: COMMON_HEADINGS,
    sectionKinds: {
      "syllabus content": "content_scope",
      assessment: "assessment_requirement",
      "assessment objectives": "assessment_requirement",
      "examination format": "examination_format",
      "paper structure": "paper_component",
      "learning objectives": "learning_outcome",
    },
    assessmentPatterns: COMMON_ASSESSMENT_PATTERNS,
    paperPatterns: COMMON_PAPER_PATTERNS,
  },

  "cambridge-as-a-level-computer-science-9618": {
    topicHeadings: COMMON_HEADINGS,
    sectionKinds: {
      "syllabus content": "content_scope",
      assessment: "assessment_requirement",
      "assessment objectives": "assessment_requirement",
      "examination format": "examination_format",
      "paper structure": "paper_component",
      "learning objectives": "learning_outcome",
    },
    assessmentPatterns: COMMON_ASSESSMENT_PATTERNS,
    paperPatterns: COMMON_PAPER_PATTERNS,
  },
};

export function getCurriculumExtractionProfile(sourceId: string): CurriculumExtractionProfile {
  return CURRICULUM_EXTRACTION_PROFILES[sourceId] ?? {
    topicHeadings: COMMON_HEADINGS,
    assessmentPatterns: COMMON_ASSESSMENT_PATTERNS,
    paperPatterns: COMMON_PAPER_PATTERNS,
  };
}
