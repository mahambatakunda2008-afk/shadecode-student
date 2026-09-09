import type {
  CurriculumIdentity,
  CurriculumObjective,
  CurriculumProvenance,
} from "../objective-first";

/**
 * Discovery-stage syllabus record.
 *
 * IMPORTANT: the objective statements below are NOT yet verified against the
 * official ZIMSEC syllabus PDF. They are intentionally marked pending and must
 * not be surfaced as examinable content until official-source review is done.
 */

export const ZIMSEC_O_LEVEL_CS_4021_2024_2030: CurriculumIdentity = {
  boardId: "zimsec",
  qualificationId: "zimsec-o-level",
  level: "o_level",
  syllabusId: "zimsec-4021",
  syllabusVersion: "2024-2030",
  subjectId: "computer-science",
};

export const ZIMSEC_O_LEVEL_CS_4021_PROVENANCE: CurriculumProvenance = {
  authority: "Zimbabwe School Examinations Council",
  sourceDocument:
    "Official ZIMSEC Computer Science 4021 syllabus, 2024-2030 cycle",
  sourceUrl: "https://www5.zimsec.co.zw/syllabi/",
  retrievedAt: "2026-09-09",
  mappingStatus: "pending",
};

/** Discovery index only. Replace statements/codes after official PDF review. */
export const ZIMSEC_O_LEVEL_CS_4021_DISCOVERY_OBJECTIVES: CurriculumObjective[] = [
  {
    id: "zimsec-4021.discovery.computer-architecture",
    curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
    code: "DISC-01",
    statement: "Computer architecture and internal components.",
    status: "draft",
    provenance: {
      ...ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
      sourceDocument:
        "Discovery summary; requires verification against official syllabus",
    },
  },
  {
    id: "zimsec-4021.discovery.data-representation",
    curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
    code: "DISC-02",
    statement: "Data representation using computer-readable forms.",
    status: "draft",
    provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  },
  {
    id: "zimsec-4021.discovery.networks",
    curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
    code: "DISC-03",
    statement: "Communication and computer networks.",
    status: "draft",
    provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  },
  {
    id: "zimsec-4021.discovery.algorithms",
    curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
    code: "DISC-04",
    statement: "Algorithm design using representations such as flowcharts and pseudocode.",
    status: "draft",
    provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  },
  {
    id: "zimsec-4021.discovery.programming",
    curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
    code: "DISC-05",
    statement: "High-level programming and implementation of computational solutions.",
    status: "draft",
    provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  },
  {
    id: "zimsec-4021.discovery.databases",
    curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
    code: "DISC-06",
    statement: "Relational databases and SQL.",
    status: "draft",
    provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  },
  {
    id: "zimsec-4021.discovery.security",
    curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
    code: "DISC-07",
    statement: "Computer security threats and defensive measures.",
    status: "draft",
    provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  },
  {
    id: "zimsec-4021.discovery-ethics",
    curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
    code: "DISC-08",
    statement: "Ethical, legal, and social issues in computing.",
    status: "draft",
    provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  },
  {
    id: "zimsec-4021.discovery-emerging-technologies",
    curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
    code: "DISC-09",
    statement: "Emerging technologies and their applications.",
    status: "draft",
    provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  },
  {
    id: "zimsec-4021.discovery-project-lifecycle",
    curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
    code: "DISC-10",
    statement: "Computer-based project development from problem identification through evaluation.",
    status: "draft",
    provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  },
];
