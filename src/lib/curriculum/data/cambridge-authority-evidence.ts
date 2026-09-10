import type { LearningScopeIdentity } from "../../code-lab/learning-scope";

/**
 * Cambridge authority evidence registry.
 *
 * Assessment pages and syllabus PDFs are tracked separately from the
 * curriculum content pack. Content must not become production-aligned until
 * the exact syllabus version has been parsed and reconciled.
 */
export interface CambridgeAuthorityEvidence {
  id: string;
  authority: "Cambridge International";
  qualification: string;
  syllabusCode: string;
  title: string;
  syllabusVersion: string;
  url: string;
  kind: "syllabus" | "syllabus-update" | "qualification-page" | "assessment-resource";
  role: "curriculum-authority" | "assessment-evidence";
  notes: string;
}

export const CAMBRIDGE_AUTHORITY_EVIDENCE: CambridgeAuthorityEvidence[] = [
  {
    id: "cambridge-igcse-computer-science-0478-2026-2028",
    authority: "Cambridge International",
    qualification: "Cambridge IGCSE Computer Science",
    syllabusCode: "0478",
    title: "Cambridge IGCSE Computer Science 0478 syllabus",
    syllabusVersion: "2026-2028",
    url: "https://www.cambridgeinternational.org/Images/697167-2026-2028-syllabus.pdf",
    kind: "syllabus",
    role: "curriculum-authority",
    notes: "Official Cambridge International syllabus PDF for examinations in 2026, 2027 and 2028.",
  },
  {
    id: "cambridge-igcse-computer-science-0478-update",
    authority: "Cambridge International",
    qualification: "Cambridge IGCSE Computer Science",
    syllabusCode: "0478",
    title: "Cambridge IGCSE Computer Science 0478 syllabus update",
    syllabusVersion: "2026-2028",
    url: "https://www.cambridgeinternational.org/Images/711263-2026-2028-syllabus-update.pdf",
    kind: "syllabus-update",
    role: "curriculum-authority",
    notes: "Official update documenting version 5 changes published December 2025.",
  },
  {
    id: "cambridge-o-level-computer-science-2210-2026-2028",
    authority: "Cambridge International",
    qualification: "Cambridge O Level Computer Science",
    syllabusCode: "2210",
    title: "Cambridge O Level Computer Science 2210 syllabus",
    syllabusVersion: "2026-2028",
    url: "https://www.cambridgeinternational.org/programmes-and-qualifications/view/cambridge-o-level-computer-science-2210/",
    kind: "qualification-page",
    role: "curriculum-authority",
    notes: "Official qualification page lists the 2026-2028 syllabus and update.",
  },
  {
    id: "cambridge-as-a-level-computer-science-9618-2027-2029",
    authority: "Cambridge International",
    qualification: "Cambridge International AS & A Level Computer Science",
    syllabusCode: "9618",
    title: "Cambridge International AS & A Level Computer Science 9618 syllabus",
    syllabusVersion: "2027-2029",
    url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-computer-science-9618/",
    kind: "qualification-page",
    role: "curriculum-authority",
    notes: "Official qualification page lists the 2027-2029 syllabus and update.",
  },
];

export const CAMBRIDGE_CURRICULUM_IDENTITIES: LearningScopeIdentity[] = [
  {
    kind: "curriculum",
    authorityId: "cambridge",
    boardId: "cambridge",
    qualificationId: "cambridge-igcse",
    level: "igcse",
    syllabusId: "cambridge-0478",
    syllabusVersion: "2026-2028",
    subjectId: "computer-science",
  },
  {
    kind: "curriculum",
    authorityId: "cambridge",
    boardId: "cambridge",
    qualificationId: "cambridge-o-level",
    level: "o_level",
    syllabusId: "cambridge-2210",
    syllabusVersion: "2026-2028",
    subjectId: "computer-science",
  },
  {
    kind: "curriculum",
    authorityId: "cambridge",
    boardId: "cambridge",
    qualificationId: "cambridge-as-a-level",
    level: "a_level",
    syllabusId: "cambridge-9618",
    syllabusVersion: "2027-2029",
    subjectId: "computer-science",
  },
];
