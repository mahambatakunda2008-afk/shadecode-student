import type { CurriculumIdentity, CurriculumProvenance } from "../objective-first";
import type { LearningContentItem, LearningScope } from "../../code-lab/learning-scope";
import { curriculumIdentityToLearningScopeIdentity } from "../content-scope";

/**
 * Candidate Cambridge Computer Science content inventory.
 *
 * This deliberately mirrors the ZIMSEC candidate-pack architecture: the
 * identity, scope hierarchy and assessment structure are explicit, but the
 * pack remains fail-closed until the complete syllabus has been reconciled.
 * Short labels are stored rather than reproducing the syllabus text.
 */

const retrievedAt = "2026-09-10";

function provenance(sourceDocument: string, sourceUrl: string): CurriculumProvenance {
  return {
    authority: "Cambridge International",
    sourceDocument,
    sourceUrl,
    retrievedAt,
    mappingStatus: "pending",
  };
}

const igcseProvenance = provenance(
  "Cambridge IGCSE Computer Science 0478 syllabus for 2026, 2027 and 2028, version 5",
  "https://www.cambridgeinternational.org/Images/697167-2026-2028-syllabus.pdf",
);

const oLevelProvenance = provenance(
  "Cambridge O Level Computer Science 2210 syllabus for 2026, 2027 and 2028",
  "https://www.cambridgeinternational.org/programmes-and-qualifications/view/cambridge-o-level-computer-science-2210/",
);

const aLevelProvenance = provenance(
  "Cambridge International AS & A Level Computer Science 9618 syllabus for 2027, 2028 and 2029",
  "https://www.cambridgeinternational.org/Images/721397-2027-2029-syllabus.pdf",
);

function item(
  identity: CurriculumIdentity,
  id: string,
  code: string,
  title: string,
  kind: LearningContentItem["kind"],
  parentId?: string,
  source: CurriculumProvenance = igcseProvenance,
): LearningContentItem {
  return {
    id,
    kind,
    code,
    title,
    content: title,
    parentId,
    status: "draft",
    identity: curriculumIdentityToScope(identity),
    provenance: source,
  };
}

function curriculumIdentity(identity: CurriculumIdentity): CurriculumIdentity {
  return identity;
}

function curriculumToScope(identity: CurriculumIdentity) {
  return curriculumIdentityToLearningScopeIdentity(curriculumIdentity(identity));
}

const igcse: CurriculumIdentity = {
  boardId: "cambridge",
  qualificationId: "cambridge-igcse",
  level: "igcse",
  syllabusId: "cambridge-0478",
  syllabusVersion: "2026-2028",
  subjectId: "computer-science",
};

const oLevel: CurriculumIdentity = {
  boardId: "cambridge",
  qualificationId: "cambridge-o-level",
  level: "o_level",
  syllabusId: "cambridge-2210",
  syllabusVersion: "2026-2028",
  subjectId: "computer-science",
};

const aLevel: CurriculumIdentity = {
  boardId: "cambridge",
  qualificationId: "cambridge-as-a-level",
  level: "a_level",
  syllabusId: "cambridge-9618",
  syllabusVersion: "2027-2029",
  subjectId: "computer-science",
};

function curriculumIdentityToScope(identity: CurriculumIdentity) {
  return curriculumToScope(identity);
}

const IGCSE_TOPICS: Array<[string, string, string[]]> = [
  ["1", "Data representation", ["1.1 Number systems", "1.2 Text, sound and images", "1.3 Data storage and compression"]],
  ["2", "Data transmission", ["2.1 Types and methods of data transmission", "2.2 Methods of error detection", "2.3 Encryption"]],
  ["3", "Hardware", ["3.1 Computer architecture", "3.2 Input and output devices", "3.3 Data storage", "3.4 Network hardware"]],
  ["4", "Software", ["4.1 Types of software and interrupts", "4.2 Types of programming language, translators and integrated development environments"]],
  ["5", "The internet and its uses", ["5.1 The internet and the World Wide Web", "5.2 Digital currency", "5.3 Cyber security"]],
  ["6", "Automated and emerging technologies", ["6.1 Automated systems", "6.2 Robotics", "6.3 Artificial intelligence"]],
  ["7", "Algorithm design and problem-solving", ["7.1 Algorithm design and problem-solving"]],
  ["8", "Programming", ["8.1 Programming concepts", "8.2 Arrays", "8.3 File handling"]],
  ["9", "Databases", ["9.1 Databases"]],
  ["10", "Boolean logic", ["10.1 Boolean logic"]],
];

const A_LEVEL_SECTIONS: Array<[string, string, string[]]> = [
  ["1", "Information representation", ["1.1 Data representation", "1.2 Multimedia - graphics and sound", "1.3 Compression"]],
  ["2", "Communication", ["2.1 Networks including the internet"]],
  ["3", "Hardware", ["3.1 Computers and their components", "3.2 Logic gates and logic circuits"]],
  ["4", "Processor fundamentals", ["4.1 Central processing unit architecture", "4.2 Assembly language", "4.3 Bit manipulation"]],
  ["5", "System software", ["5.1 Operating systems", "5.2 Language translators"]],
  ["6", "Security, privacy and data integrity", ["6.1 Data security", "6.2 Data integrity"]],
  ["7", "Ethics and ownership", ["7.1 Ethics and ownership"]],
  ["8", "Databases", ["8.1 Database concepts", "8.2 Database management systems", "8.3 Data definition language and data manipulation language"]],
  ["9", "Algorithm design and problem-solving", ["9.1 Computational thinking skills", "9.2 Algorithms"]],
  ["10", "Data types and structures", ["10.1 Data types and records", "10.2 Arrays", "10.3 Files", "10.4 Introduction to abstract data types"]],
  ["11", "Programming", ["11.1 Programming basics", "11.2 Constructs", "11.3 Structured programming"]],
  ["12", "Software development", ["12.1 Program development life cycle", "12.2 Program design", "12.3 Program testing and maintenance"]],
  ["13", "Data representation", ["13.1 User-defined data types", "13.2 File organisation and access", "13.3 Floating-point numbers, representation and manipulation"]],
  ["14", "Communication and internet technologies", ["14.1 Protocols", "14.2 Circuit switching and packet switching"]],
  ["15", "Hardware and virtual machines", ["15.1 Processors, parallel processing and virtual machines", "15.2 Boolean algebra and logic circuits"]],
  ["16", "System software", ["16.1 Purposes of an operating system", "16.2 Translation software"]],
  ["17", "Security", ["17.1 Encryption, encryption protocols and digital certificates"]],
  ["18", "Artificial intelligence", ["18.1 Artificial intelligence"]],
  ["19", "Computational thinking and problem-solving", ["19.1 Algorithms", "19.2 Recursion"]],
  ["20", "Further programming", ["20.1 Programming paradigms", "20.2 File processing and exception handling"]],
];

function buildHierarchy(identity: CurriculumIdentity, source: CurriculumProvenance, sections: Array<[string, string, string[]]>) {
  const result: LearningContentItem[] = [];
  for (const [number, title, children] of sections) {
    const parentId = `${identity.syllabusId}:${number}`;
    result.push(item(identity, parentId, number, title, "topic", undefined, source));
    children.forEach((child, index) => {
      const id = `${identity.syllabusId}:${number}.${index + 1}`;
      result.push(item(identity, id, child.split(" ")[0], child, "subtopic", parentId, source));
    });
  }
  return result;
}

export const CAMBRIDGE_IGCSE_0478_CANDIDATE_CONTENT = buildHierarchy(igcse, igcseProvenance, IGCSE_TOPICS);
export const CAMBRIDGE_O_LEVEL_2210_CANDIDATE_CONTENT = buildHierarchy(oLevel, oLevelProvenance, IGCSE_TOPICS);
export const CAMBRIDGE_9618_CANDIDATE_CONTENT = buildHierarchy(aLevel, aLevelProvenance, A_LEVEL_SECTIONS);

export interface CambridgeAssessmentComponent {
  id: string;
  paper: string;
  title: string;
  durationMinutes: number;
  marks: number;
  weighting: string;
  scope: string;
  mode: "written" | "practical";
  calculatorAllowed: boolean;
  notes: string;
}

export const CAMBRIDGE_0478_ASSESSMENT: CambridgeAssessmentComponent[] = [
  { id: "0478-paper-1", paper: "Paper 1", title: "Computer Systems", durationMinutes: 105, marks: 75, weighting: "50%", scope: "Topics 1-6", mode: "written", calculatorAllowed: false, notes: "Short-answer and structured questions; compulsory; externally assessed." },
  { id: "0478-paper-2", paper: "Paper 2", title: "Algorithms, Programming and Logic", durationMinutes: 105, marks: 75, weighting: "50%", scope: "Topics 7-10", mode: "written", calculatorAllowed: false, notes: "Short-answer, structured and scenario-based questions; compulsory; externally assessed." },
];

export const CAMBRIDGE_2210_ASSESSMENT: CambridgeAssessmentComponent[] = [
  { id: "2210-paper-1", paper: "Paper 1", title: "Computer Systems", durationMinutes: 105, marks: 75, weighting: "50%", scope: "Topics 1-6", mode: "written", calculatorAllowed: false, notes: "Short-answer and structured questions; grades A*-E; compulsory; externally assessed." },
  { id: "2210-paper-2", paper: "Paper 2", title: "Algorithms, Programming and Logic", durationMinutes: 105, marks: 75, weighting: "50%", scope: "Topics 7-10", mode: "written", calculatorAllowed: false, notes: "Short-answer, structured and scenario-based questions; compulsory; externally assessed." },
];

export const CAMBRIDGE_9618_ASSESSMENT: CambridgeAssessmentComponent[] = [
  { id: "9618-paper-1", paper: "Paper 1", title: "Theory Fundamentals", durationMinutes: 90, marks: 75, weighting: "50% AS / 25% A Level", scope: "Sections 1-8", mode: "written", calculatorAllowed: false, notes: "All questions answered." },
  { id: "9618-paper-2", paper: "Paper 2", title: "Fundamental Problem-solving and Programming Skills", durationMinutes: 120, marks: 75, weighting: "50% AS / 25% A Level", scope: "Sections 9-12", mode: "written", calculatorAllowed: false, notes: "Answers written in pseudocode." },
  { id: "9618-paper-3", paper: "Paper 3", title: "Advanced Theory", durationMinutes: 90, marks: 75, weighting: "25% A Level", scope: "Sections 13-20", mode: "written", calculatorAllowed: false, notes: "All questions answered." },
  { id: "9618-paper-4", paper: "Paper 4", title: "Practical", durationMinutes: 150, marks: 75, weighting: "25% A Level", scope: "Sections 19-20, except low-level and declarative programming", mode: "practical", calculatorAllowed: false, notes: "Programming on a centre computer without internet/email; Java, Visual Basic console mode or Python; code and testing evidence required." },
];

export const CAMBRIDGE_CANDIDATE_SCOPES: LearningScope[] = [
  { identity: curriculumIdentityToLearningScopeIdentity(igcse), content: CAMBRIDGE_IGCSE_0478_CANDIDATE_CONTENT, complete: false, verified: false },
  { identity: curriculumIdentityToLearningScopeIdentity(oLevel), content: CAMBRIDGE_O_LEVEL_2210_CANDIDATE_CONTENT, complete: false, verified: false },
  { identity: curriculumIdentityToLearningScopeIdentity(aLevel), content: CAMBRIDGE_9618_CANDIDATE_CONTENT, complete: false, verified: false },
];

export const CAMBRIDGE_CANDIDATE_ASSESSMENT = {
  "0478": CAMBRIDGE_0478_ASSESSMENT,
  "2210": CAMBRIDGE_2210_ASSESSMENT,
  "9618": CAMBRIDGE_9618_ASSESSMENT,
} as const;
