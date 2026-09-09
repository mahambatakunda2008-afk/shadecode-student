export type SourceKind = "landing-page" | "pdf" | "update-page";
export type WatchFrequency = "daily" | "weekly" | "monthly";

export interface CurriculumSourceWatch {
  id: string;
  boardId: string;
  qualificationId?: string;
  subjectId?: string;
  level?: string;
  syllabusId?: string;
  syllabusVersion?: string;
  authority: string;
  kind: SourceKind;
  url: string;
  allowedDomains: string[];
  frequency: WatchFrequency;
  discoverLinkedDocuments: boolean;
  extractText: boolean;
  objectiveCodePattern?: string;
  autoPromote: false;
}

/**
 * Autonomous source registry for whole-syllabus monitoring.
 *
 * A source can identify one syllabus precisely or act as a board-level
 * discovery point. The ingestion pipeline never assumes that every board
 * structures its syllabus the same way. Objectives are one knowledge layer,
 * not the definition of curriculum.
 */
export const CURRICULUM_SOURCE_WATCHES: CurriculumSourceWatch[] = [
  {
    id: "zimsec-syllabi",
    boardId: "zimsec",
    qualificationId: "zimsec-o-level",
    subjectId: "computer-science",
    level: "o_level",
    syllabusId: "zimsec-4021",
    syllabusVersion: "2024-2030",
    authority: "Zimbabwe School Examinations Council",
    kind: "landing-page",
    url: "https://www5.zimsec.co.zw/syllabi/",
    allowedDomains: ["www5.zimsec.co.zw", "zimsec.co.zw"],
    frequency: "weekly",
    discoverLinkedDocuments: true,
    extractText: true,
    objectiveCodePattern: "^(?:4\\.(?:[1-9]|10)|8\\.(?:1[2-9]|2[0-9]|3[0-9]|4[0-4]))$",
    autoPromote: false,
  },
  {
    id: "cambridge-igcse-computer-science-0478",
    boardId: "cambridge",
    qualificationId: "cambridge-igcse",
    subjectId: "computer-science-0478",
    level: "igcse",
    syllabusId: "0478",
    authority: "Cambridge International Education",
    kind: "landing-page",
    url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-computer-science-0478/",
    allowedDomains: ["www.cambridgeinternational.org", "cambridgeinternational.org"],
    frequency: "weekly",
    discoverLinkedDocuments: true,
    extractText: true,
    autoPromote: false,
  },
  {
    id: "cambridge-o-level-computer-science-2210",
    boardId: "cambridge",
    qualificationId: "cambridge-o-level",
    subjectId: "computer-science-2210",
    level: "o_level",
    syllabusId: "2210",
    authority: "Cambridge International Education",
    kind: "landing-page",
    url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-o-level-computer-science-2210/",
    allowedDomains: ["www.cambridgeinternational.org", "cambridgeinternational.org"],
    frequency: "weekly",
    discoverLinkedDocuments: true,
    extractText: true,
    autoPromote: false,
  },
  {
    id: "cambridge-as-a-level-computer-science-9618",
    boardId: "cambridge",
    qualificationId: "cambridge-international-as-a-level",
    subjectId: "computer-science-9618",
    level: "a_level",
    syllabusId: "9618",
    authority: "Cambridge International Education",
    kind: "landing-page",
    url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-computer-science-9618/",
    allowedDomains: ["www.cambridgeinternational.org", "cambridgeinternational.org"],
    frequency: "weekly",
    discoverLinkedDocuments: true,
    extractText: true,
    autoPromote: false,
  },
];

export function getCurriculumSourceWatch(id: string): CurriculumSourceWatch | undefined {
  return CURRICULUM_SOURCE_WATCHES.find((source) => source.id === id);
}
