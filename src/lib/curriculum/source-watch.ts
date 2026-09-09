export type SourceKind = "landing-page" | "pdf" | "update-page";
export type WatchFrequency = "daily" | "weekly" | "monthly";

export interface CurriculumSourceWatch {
  id: string;
  boardId: string;
  qualificationId?: string;
  subjectId?: string;
  level?: string;
  authority: string;
  kind: SourceKind;
  url: string;
  allowedDomains: string[];
  frequency: WatchFrequency;
  discoverLinkedDocuments: boolean;
  extractText: boolean;
  autoPromote: false;
}

/**
 * Source registry for the autonomous curriculum watcher.
 *
 * The registry is intentionally generic: adding a board means adding source
 * metadata, not changing the watcher itself. Documents discovered by the
 * watcher are never promoted directly to verified curriculum content.
 */
export const CURRICULUM_SOURCE_WATCHES: CurriculumSourceWatch[] = [
  {
    id: "zimsec-syllabi",
    boardId: "zimsec",
    authority: "Zimbabwe School Examinations Council",
    kind: "landing-page",
    url: "https://www5.zimsec.co.zw/syllabi/",
    allowedDomains: ["www5.zimsec.co.zw", "zimsec.co.zw"],
    frequency: "weekly",
    discoverLinkedDocuments: true,
    extractText: true,
    autoPromote: false,
  },
  {
    id: "cambridge-igcse-computer-science-0478",
    boardId: "cambridge",
    qualificationId: "cambridge-igcse",
    subjectId: "computer-science-0478",
    level: "igcse",
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
