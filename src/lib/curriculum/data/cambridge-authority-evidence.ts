import type { LearningScopeIdentity } from "../../code-lab/learning-scope";

/**
 * Cambridge authority evidence registry.
 *
 * Syllabus PDFs are the curriculum authority. Qualification pages and
 * assessment resources provide supporting evidence, but never substitute for
 * the exact syllabus version when building an aligned learning scope.
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
    notes: "Official syllabus PDF. Version 5, published December 2025.",
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
    notes: "Official version/update record, including version 5 changes.",
  },
  {
    id: "cambridge-igcse-computer-science-0984-2026-2028",
    authority: "Cambridge International",
    qualification: "Cambridge IGCSE (9-1) Computer Science",
    syllabusCode: "0984",
    title: "Cambridge IGCSE (9-1) Computer Science 0984",
    syllabusVersion: "2026-2028",
    url: "https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-igcse-9-1-computer-science-0984/",
    kind: "qualification-page",
    role: "curriculum-authority",
    notes: "Official qualification page states 0984 is otherwise the same syllabus as 0478, with a 9-1 grading scale.",
  },
  {
    id: "cambridge-o-level-computer-science-2210-2026-2028",
    authority: "Cambridge International",
    qualification: "Cambridge O Level Computer Science",
    syllabusCode: "2210",
    title: "Cambridge O Level Computer Science 2210 syllabus",
    syllabusVersion: "2026-2028",
    url: "https://www.cambridgeinternational.org/Images/697287-2026-2028-syllabus.pdf",
    kind: "syllabus",
    role: "curriculum-authority",
    notes: "Official syllabus PDF, Version 6. The syllabus explicitly states that it shares content with Cambridge IGCSE Computer Science 0478.",
  },
  {
    id: "cambridge-o-level-computer-science-2210-page",
    authority: "Cambridge International",
    qualification: "Cambridge O Level Computer Science",
    syllabusCode: "2210",
    title: "Cambridge O Level Computer Science 2210 qualification page",
    syllabusVersion: "2026-2028",
    url: "https://www.cambridgeinternational.org/programmes-and-qualifications/view/cambridge-o-level-computer-science-2210/",
    kind: "qualification-page",
    role: "curriculum-authority",
    notes: "Official qualification page and syllabus/update index.",
  },
  {
    id: "cambridge-as-a-level-computer-science-9618-2027-2029",
    authority: "Cambridge International",
    qualification: "Cambridge International AS & A Level Computer Science",
    syllabusCode: "9618",
    title: "Cambridge International AS & A Level Computer Science 9618 syllabus",
    syllabusVersion: "2027-2029",
    url: "https://www.cambridgeinternational.org/Images/721397-2027-2029-syllabus.pdf",
    kind: "syllabus",
    role: "curriculum-authority",
    notes: "Official syllabus PDF, version 1 published September 2024.",
  },
  {
    id: "cambridge-as-a-level-computer-science-9618-page",
    authority: "Cambridge International",
    qualification: "Cambridge International AS & A Level Computer Science",
    syllabusCode: "9618",
    title: "Cambridge International AS & A Level Computer Science 9618 qualification page",
    syllabusVersion: "2027-2029",
    url: "https://www.cambridgeinternational.org/programmes-and-qualifications/view/cambridge-international-as-and-a-level-computer-science-9618/",
    kind: "qualification-page",
    role: "curriculum-authority",
    notes: "Official qualification page listing the current syllabus and syllabus update resources.",
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
    qualificationId: "cambridge-igcse-9-1",
    level: "igcse",
    syllabusId: "cambridge-0984",
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
