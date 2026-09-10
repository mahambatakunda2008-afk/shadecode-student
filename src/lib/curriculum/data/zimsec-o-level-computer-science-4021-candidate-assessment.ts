import type { LearningContentItem } from "../../code-lab/learning-scope";
import { ZIMSEC_O_LEVEL_CS_4021_2024_2030 } from "./zimsec-o-level-computer-science-4021-2024-2030";

/**
 * Candidate assessment model for ZIMSEC Computer Science 4021, 2024-2030.
 *
 * The structure below is transcribed from a secondary copy of the syllabus.
 * It is deliberately draft/unverified. Official ZIMSEC assessment pages and
 * timetables corroborate the existence of the 4021 paper family, but they do
 * not by themselves verify this full assessment specification.
 */

const provenance = {
  authority: "Ministry of Primary and Secondary Education / secondary syllabus copy",
  sourceDocument: "Computer Science Syllabus Forms 1-4, 2024-2030 (secondary copy)",
  sourceUrl: "https://studylib.net/doc/28527371/computer-science-o-level-syllabus",
  sectionOrPage: "Sections 9.2, 9.3 and 9.4; assessment model, specification grid and paper descriptions",
  retrievedAt: "2026-09-10",
  mappingStatus: "reviewed" as const,
};

const identity = {
  kind: "curriculum" as const,
  authorityId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.boardId,
  boardId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.boardId,
  qualificationId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.qualificationId,
  level: ZIMSEC_O_LEVEL_CS_4021_2024_2030.level,
  syllabusId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.syllabusId,
  syllabusVersion: ZIMSEC_O_LEVEL_CS_4021_2024_2030.syllabusVersion,
  subjectId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.subjectId,
};

const item = (
  id: string,
  title: string,
  content: string,
  metadata: Record<string, unknown>,
): LearningContentItem => ({
  id,
  kind: "assessment",
  title,
  content,
  status: "draft",
  identity,
  provenance,
  metadata: { ...metadata, sourceType: "secondary-syllabus-copy" },
});

export const ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_ASSESSMENT: LearningContentItem[] = [
  item(
    "zimsec-4021-assessment-model",
    "Assessment model",
    "School Based Continuous Assessment contributes 20% and Summative Assessment contributes 80% in the syllabus assessment model.",
    { section: "9.2", assessmentType: "model", weighting: { continuous: 20, summative: 80 } },
  ),
  item(
    "zimsec-4021-paper-1",
    "Paper 1: Multiple Choice",
    "Theory paper consisting of 40 compulsory multiple-choice items; the candidate syllabus copy specifies a 1-hour duration and 10% weighting.",
    { paper: "1", format: "multiple-choice", durationMinutes: 60, weightingPercent: 10, section: "9.3.2; 9.4" },
  ),
  item(
    "zimsec-4021-paper-2",
    "Paper 2: Structured",
    "Theory paper consisting of 10-12 structured questions, with candidates required to answer all questions; the candidate syllabus copy specifies a 2-hour duration and 30% weighting.",
    { paper: "2", format: "structured", durationMinutes: 120, weightingPercent: 30, section: "9.3.2; 9.4" },
  ),
  item(
    "zimsec-4021-paper-3-option-a",
    "Paper 3 Option A: Practical",
    "Practical examination covering Programming, Databases and Web Design; the candidate syllabus copy specifies a 3-hour duration and 40% weighting.",
    { paper: "3", option: "A", format: "practical", durationMinutes: 180, weightingPercent: 40, sections: ["9.3.2", "9.4"] },
  ),
  item(
    "zimsec-4021-paper-3-option-b",
    "Paper 3 Option B: Practical",
    "Practical examination covering Hardware and Software, Data Representation, Communication Networks and Internet Technologies, and Technopreneurship; the candidate syllabus copy specifies a 3-hour duration and 40% weighting.",
    { paper: "3", option: "B", format: "practical", durationMinutes: 180, weightingPercent: 40, sections: ["9.3.2", "9.4"] },
  ),
  item(
    "zimsec-4021-paper-4",
    "Paper 4: School Based Assessment",
    "Coursework made up of 10 assignments, 10 tests and 5 practical assignments set, marked and recorded internally by teachers.",
    { paper: "4", format: "coursework", section: "9.4", components: { assignments: 10, tests: 10, practicalAssignments: 5 } },
  ),
  item(
    "zimsec-4021-paper-5",
    "Paper 5: Project work",
    "Project work using pre-release material, with practical programming experience including writing, executing, testing and debugging programs.",
    { paper: "5", format: "project", section: "9.4", suggestedLanguages: ["Visual Basic", "Python"] },
  ),
  item(
    "zimsec-4021-school-project",
    "School-based project execution",
    "Project stages: problem identification, investigation, generation of possible solutions, selection of the most suitable solution, refinement, presentation, and evaluation with recommendations.",
    { section: "9.3.1.1", format: "project", stages: 7, totalMarks: 50 },
  ),
];

export const ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_ASSESSMENT_COMPLETE = false;
export const ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_ASSESSMENT_VERIFIED = false;
