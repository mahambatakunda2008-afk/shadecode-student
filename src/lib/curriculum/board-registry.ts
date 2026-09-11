export type CurriculumSupport = "verified" | "available" | "framework";

export type CurriculumBoardDefinition = {
  boardId: string;
  name: string;
  qualifications: string[];
  levels: string[];
  support: CurriculumSupport;
  sourceOfTruth: string;
};

export const CURRICULUM_BOARDS: CurriculumBoardDefinition[] = [
  {
    boardId: "zimsec",
    name: "Zimbabwe School Examinations Council",
    qualifications: ["zimsec-o-level", "zimsec-a-level"],
    levels: ["primary", "o_level", "a_level"],
    support: "available",
    sourceOfTruth: "Published ZIMSEC syllabus documents and official syllabus resource pages",
  },
  {
    boardId: "cambridge",
    name: "Cambridge International Education",
    qualifications: ["cambridge-igcse", "cambridge-igcse-9-1", "cambridge-o-level", "cambridge-as-a-level"],
    levels: ["primary", "lower_secondary", "igcse", "o_level", "as", "a_level"],
    support: "available",
    sourceOfTruth: "Official Cambridge International syllabus documents",
  },
  {
    boardId: "pearson-edexcel",
    name: "Pearson Edexcel",
    qualifications: ["gcse", "international-gcse", "international-a-level"],
    levels: ["gcse", "igcse", "as", "a_level"],
    support: "available",
    sourceOfTruth: "Official Pearson qualification specifications",
  },
  {
    boardId: "ib",
    name: "International Baccalaureate",
    qualifications: ["myp", "dp"],
    levels: ["middle_years", "diploma"],
    support: "available",
    sourceOfTruth: "Official IB curriculum guides and subject guides",
  },
  {
    boardId: "tertiary",
    name: "University / Polytechnic / TVET",
    qualifications: ["university", "polytechnic", "tvet"],
    levels: ["certificate", "diploma", "degree", "professional"],
    support: "framework",
    sourceOfTruth: "Institution or programme-approved curriculum documents",
  },
];
