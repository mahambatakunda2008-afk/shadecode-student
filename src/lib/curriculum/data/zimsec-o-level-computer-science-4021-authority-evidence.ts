import type { LearningScopeIdentity } from "../../code-lab/learning-scope";
import { ZIMSEC_O_LEVEL_CS_4021_2024_2030 } from "./zimsec-o-level-computer-science-4021-2024-2030";

/**
 * Official ZIMSEC evidence that corroborates the 4021 examination identity
 * and assessment surface. This is not a substitute for the syllabus.
 *
 * The syllabus remains the authority for curriculum content. Until the
 * official Computer Science 4021 syllabus document is retrieved and fully
 * reconciled, these records must not flip a content pack to verified.
 */
export interface CurriculumAuthorityEvidence {
  id: string;
  authority: string;
  kind: "syllabus-index" | "exam-paper" | "timetable";
  title: string;
  url: string;
  role: "curriculum-authority" | "assessment-evidence";
  notes: string;
}

export const ZIMSEC_O_LEVEL_CS_4021_AUTHORITY_EVIDENCE: CurriculumAuthorityEvidence[] = [
  {
    id: "zimsec-4021-syllabus-index",
    authority: "Zimbabwe School Examinations Council",
    kind: "syllabus-index",
    title: "ZIMSEC Syllabi",
    url: "https://www5.zimsec.co.zw/syllabi/",
    role: "curriculum-authority",
    notes:
      "Official syllabus repository. The year selector is dynamically rendered, so the Computer Science 4021 syllabus document still requires direct retrieval before verification.",
  },
  {
    id: "zimsec-4021-01",
    authority: "Zimbabwe School Examinations Council",
    kind: "exam-paper",
    title: "Computer Science 4021/01",
    url: "https://www5.zimsec.co.zw/download/computer-science-4021-01/",
    role: "assessment-evidence",
    notes: "Official ZIMSEC assessment resource page, created and updated March 9, 2026.",
  },
  {
    id: "zimsec-4021-02",
    authority: "Zimbabwe School Examinations Council",
    kind: "exam-paper",
    title: "Computer Science 4021/02",
    url: "https://www5.zimsec.co.zw/download/computer-science-4021-02/",
    role: "assessment-evidence",
    notes: "Official ZIMSEC assessment resource page, created and updated March 9, 2026.",
  },
  {
    id: "zimsec-4021-03",
    authority: "Zimbabwe School Examinations Council",
    kind: "exam-paper",
    title: "Computer Science 4021/03",
    url: "https://www5.zimsec.co.zw/download/computer-science-4021-03/",
    role: "assessment-evidence",
    notes: "Official ZIMSEC assessment resource page, created and updated March 9, 2026.",
  },
  {
    id: "zimsec-4021-nov-2024-timetable",
    authority: "Zimbabwe School Examinations Council",
    kind: "timetable",
    title: "November 2024 O-Level Examination Timetable",
    url: "https://www5.zimsec.co.zw/wp-content/uploads/2024/05/Nov-2024-O-level-Final.pdf",
    role: "assessment-evidence",
    notes: "Official timetable records 4021/03 Computer Science 03 as a 3-hour paper on November 21, 2024.",
  },
];

export interface CurriculumAuthorityEvidenceBundle {
  identity: LearningScopeIdentity;
  evidence: CurriculumAuthorityEvidence[];
  syllabusContentVerified: false;
}

export const ZIMSEC_O_LEVEL_CS_4021_AUTHORITY_EVIDENCE_BUNDLE: CurriculumAuthorityEvidenceBundle = {
  identity: {
    kind: "curriculum",
    authorityId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.boardId,
    boardId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.boardId,
    qualificationId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.qualificationId,
    level: ZIMSEC_O_LEVEL_CS_4021_2024_2030.level,
    syllabusId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.syllabusId,
    syllabusVersion: ZIMSEC_O_LEVEL_CS_4021_2024_2030.syllabusVersion,
    subjectId: ZIMSEC_O_LEVEL_CS_4021_2024_2030.subjectId,
  },
  evidence: ZIMSEC_O_LEVEL_CS_4021_AUTHORITY_EVIDENCE,
  syllabusContentVerified: false,
};
