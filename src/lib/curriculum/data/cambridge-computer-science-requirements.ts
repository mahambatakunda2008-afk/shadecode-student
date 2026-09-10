import type { CurriculumProvenance } from "../objective-first";

/**
 * Structured Cambridge Computer Science requirements.
 *
 * These are concise paraphrases of official syllabus requirements, not a copy
 * of the syllabus text. They are intentionally separate from the candidate
 * content hierarchy so Code Lab can distinguish "topic exists" from "learner
 * must demonstrate this capability".
 *
 * Status remains candidate/draft until every requirement is reconciled against
 * the exact syllabus version and linked to authoritative source sections.
 */
export interface CambridgeLearningRequirement {
  id: string;
  syllabusId: "cambridge-0478" | "cambridge-0984" | "cambridge-2210" | "cambridge-9618";
  version: "2026-2028" | "2027-2029";
  section: string;
  kind: "knowledge" | "understanding" | "skill" | "application" | "evaluation" | "practical";
  requirement: string;
  status: "draft" | "verified";
}

export interface CambridgeAssessmentObjective {
  id: string;
  syllabusId: "cambridge-0478" | "cambridge-9618";
  statement: string;
  weightingPercent: number;
  status: "draft" | "verified";
}

export interface CambridgeExamRequirement {
  id: string;
  syllabusId: "cambridge-0478" | "cambridge-0984" | "cambridge-2210" | "cambridge-9618";
  requirement: string;
  status: "draft" | "verified";
}

const retrievedAt = "2026-09-10";

export const CAMBRIDGE_CS_PROVENANCE: CurriculumProvenance = {
  authority: "Cambridge International",
  sourceDocument: "Cambridge Computer Science syllabuses 0478/0984/2210 (2026-2028) and 9618 (2027-2029)",
  sourceUrl: "https://www.cambridgeinternational.org/find-syllabus-materials/",
  retrievedAt,
  mappingStatus: "pending",
};

/** 0478/0984/2210 share the same teaching content; 0984 differs in grading. */
export const CAMBRIDGE_IGCSE_CS_REQUIREMENTS: CambridgeLearningRequirement[] = [
  { id: "0478-1.1-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "1.1", kind: "understanding", requirement: "Explain binary as the machine representation used for data and work with denary, binary and hexadecimal representations.", status: "draft" },
  { id: "0478-1.1-r2", syllabusId: "cambridge-0478", version: "2026-2028", section: "1.1", kind: "skill", requirement: "Convert between positive denary, binary and hexadecimal; perform 8-bit binary addition and reason about overflow.", status: "draft" },
  { id: "0478-1.1-r3", syllabusId: "cambridge-0478", version: "2026-2028", section: "1.1", kind: "skill", requirement: "Perform logical binary shifts and represent positive and negative 8-bit integers using two's complement.", status: "draft" },
  { id: "0478-1.2-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "1.2", kind: "understanding", requirement: "Explain computer representation of text using character sets, sound using sampling, and images using pixels.", status: "draft" },
  { id: "0478-1.2-r2", syllabusId: "cambridge-0478", version: "2026-2028", section: "1.2", kind: "application", requirement: "Relate sample rate, sample resolution, image resolution and colour depth to quality and file size.", status: "draft" },
  { id: "0478-1.3-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "1.3", kind: "skill", requirement: "Use binary storage units and calculate image and sound file sizes using the syllabus measurement rules.", status: "draft" },
  { id: "0478-1.3-r2", syllabusId: "cambridge-0478", version: "2026-2028", section: "1.3", kind: "understanding", requirement: "Explain why compression is used and distinguish lossy from lossless approaches, including run-length encoding.", status: "draft" },
  { id: "0478-2.1-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "2.1", kind: "understanding", requirement: "Explain packet structure, packet switching and the roles of routing and packet reordering.", status: "draft" },
  { id: "0478-2.1-r2", syllabusId: "cambridge-0478", version: "2026-2028", section: "2.1", kind: "application", requirement: "Compare serial, parallel, simplex, half-duplex and full-duplex transmission and select an appropriate method for a scenario.", status: "draft" },
  { id: "0478-2.1-r3", syllabusId: "cambridge-0478", version: "2026-2028", section: "2.1", kind: "understanding", requirement: "Explain how USB is used as a data-transmission interface.", status: "draft" },
  { id: "0478-2.2-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "2.2", kind: "understanding", requirement: "Explain why transmission errors occur and how parity, checksum, echo check, check digits and ARQ detect or recover from errors.", status: "draft" },
  { id: "0478-2.3-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "2.3", kind: "understanding", requirement: "Explain the purpose of encryption and compare symmetric and asymmetric encryption in context.", status: "draft" },
  { id: "0478-3.1-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "3.1", kind: "understanding", requirement: "Describe CPU components and the fetch-decode-execute cycle, including registers, buses, clock and embedded processors.", status: "draft" },
  { id: "0478-3.1-r2", syllabusId: "cambridge-0478", version: "2026-2028", section: "3.1", kind: "application", requirement: "Explain how CPU performance is affected by clock speed, cache, cores and word length, and justify choices for scenarios.", status: "draft" },
  { id: "0478-3.2-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "3.2", kind: "understanding", requirement: "Explain how common input and output devices operate and select devices for suitable uses.", status: "draft" },
  { id: "0478-3.3-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "3.3", kind: "understanding", requirement: "Compare magnetic, optical and solid-state storage, and explain virtual memory and cloud storage at syllabus depth.", status: "draft" },
  { id: "0478-3.4-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "3.4", kind: "understanding", requirement: "Explain NICs, MAC addresses, IPv4/IPv6, static/dynamic IP addressing and router roles.", status: "draft" },
  { id: "0478-4.1-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "4.1", kind: "understanding", requirement: "Distinguish system software from application software and explain operating-system functions, including interrupt handling.", status: "draft" },
  { id: "0478-4.2-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "4.2", kind: "understanding", requirement: "Compare high-level and low-level languages, explain translators and identify the role of an IDE.", status: "draft" },
  { id: "0478-5.1-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "5.1", kind: "understanding", requirement: "Explain how internet communication uses DNS, IP, URLs, web browsers and web servers, and distinguish the internet from the World Wide Web.", status: "draft" },
  { id: "0478-5.2-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "5.2", kind: "understanding", requirement: "Explain digital currency, including blockchain concepts and the role of cryptography in transactions.", status: "draft" },
  { id: "0478-5.3-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "5.3", kind: "application", requirement: "Identify cyber-security threats and appropriate countermeasures, including malware, social engineering, authentication and firewalls.", status: "draft" },
  { id: "0478-6.1-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "6.1", kind: "application", requirement: "Explain automated systems using sensors, microprocessors and actuators and evaluate suitability for real-world scenarios.", status: "draft" },
  { id: "0478-6.2-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "6.2", kind: "understanding", requirement: "Explain robotics, robot characteristics and roles, including advantages and disadvantages.", status: "draft" },
  { id: "0478-6.3-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "6.3", kind: "understanding", requirement: "Explain AI characteristics and the syllabus-level operation of expert systems and machine learning.", status: "draft" },
  { id: "0478-7.1-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "7.1", kind: "skill", requirement: "Use abstraction, decomposition, algorithmic thinking, flowcharts and pseudocode to design solutions.", status: "draft" },
  { id: "0478-7.2-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "7.2", kind: "skill", requirement: "Trace and test algorithms, identify errors and refine algorithms using dry runs and test data.", status: "draft" },
  { id: "0478-7.3-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "7.3", kind: "skill", requirement: "Use validation and verification appropriately and explain why each check is needed.", status: "draft" },
  { id: "0478-8.1-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "8.1", kind: "skill", requirement: "Write, trace, test and debug programs using variables, constants, data types, operators, selection, iteration, procedures and functions.", status: "draft" },
  { id: "0478-8.1-r2", syllabusId: "cambridge-0478", version: "2026-2028", section: "8.1", kind: "practical", requirement: "Produce maintainable programs using meaningful identifiers, comments and appropriate decomposition.", status: "draft" },
  { id: "0478-8.2-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "8.2", kind: "skill", requirement: "Declare, traverse, read and write one-dimensional and two-dimensional arrays, including nested iteration.", status: "draft" },
  { id: "0478-8.3-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "8.3", kind: "practical", requirement: "Open, close, read and write files and use stored data in a program.", status: "draft" },
  { id: "0478-9-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "9", kind: "skill", requirement: "Design a single-table database, choose suitable basic data types and identify primary keys.", status: "draft" },
  { id: "0478-9-r2", syllabusId: "cambridge-0478", version: "2026-2028", section: "9", kind: "skill", requirement: "Read, complete and reason about the syllabus-limited SQL operations used to query a single table.", status: "draft" },
  { id: "0478-10-r1", syllabusId: "cambridge-0478", version: "2026-2028", section: "10", kind: "skill", requirement: "Use standard logic-gate symbols, construct truth tables and simplify or evaluate Boolean expressions at syllabus depth.", status: "draft" },
];

export const CAMBRIDGE_0984_CS_REQUIREMENTS = CAMBRIDGE_IGCSE_CS_REQUIREMENTS.map((r) => ({
  ...r,
  id: r.id.replace("0478", "0984"),
  syllabusId: "cambridge-0984" as const,
}));

export const CAMBRIDGE_2210_CS_REQUIREMENTS = CAMBRIDGE_IGCSE_CS_REQUIREMENTS.map((r) => ({
  ...r,
  id: r.id.replace("0478", "2210"),
  syllabusId: "cambridge-2210" as const,
}));

export const CAMBRIDGE_0478_ASSESSMENT_OBJECTIVES: CambridgeAssessmentObjective[] = [
  { id: "0478-AO1", syllabusId: "cambridge-0478", statement: "Know and understand computer-science principles and concepts.", weightingPercent: 40, status: "draft" },
  { id: "0478-AO2", syllabusId: "cambridge-0478", statement: "Apply principles and concepts to contexts, including analysing and designing computational or programming problems.", weightingPercent: 40, status: "draft" },
  { id: "0478-AO3", syllabusId: "cambridge-0478", statement: "Evaluate systems, make reasoned judgements and present conclusions when solving problems.", weightingPercent: 20, status: "draft" },
];

export const CAMBRIDGE_0478_EXAM_REQUIREMENTS: CambridgeExamRequirement[] = [
  { id: "0478-exam-pseudocode", syllabusId: "cambridge-0478", requirement: "For Paper 2 coding solutions, use the Cambridge pseudocode format; the scenario question permits pseudocode or Python, Visual Basic or Java.", status: "draft" },
  { id: "0478-exam-paper-1", syllabusId: "cambridge-0478", requirement: "Paper 1 is compulsory, 1 hour 45 minutes, 75 marks, 50%, Topics 1-6, no calculator.", status: "draft" },
  { id: "0478-exam-paper-2", syllabusId: "cambridge-0478", requirement: "Paper 2 is compulsory, 1 hour 45 minutes, 75 marks, 50%, Topics 7-10, includes a scenario-based question, no calculator.", status: "draft" },
  { id: "0478-practical", syllabusId: "cambridge-0478", requirement: "Practical programming, testing and debugging must be integrated into teaching even though the qualification is assessed through the two written papers.", status: "draft" },
  { id: "0478-guided-hours", syllabusId: "cambridge-0478", requirement: "Cambridge designs the syllabus around about 130 guided learning hours; this is guidance rather than a fixed learner schedule.", status: "draft" },
];

export const CAMBRIDGE_0478_COMMAND_WORDS = [
  "calculate", "compare", "define", "demonstrate", "describe", "evaluate", "explain", "give", "identify", "outline", "show", "state", "suggest",
] as const;

export const CAMBRIDGE_9618_ASSESSMENT_OBJECTIVES: CambridgeAssessmentObjective[] = [
  { id: "9618-AO1", syllabusId: "cambridge-9618", statement: "Demonstrate knowledge and understanding of computer-science principles and concepts.", weightingPercent: 50, status: "draft" },
  { id: "9618-AO2", syllabusId: "cambridge-9618", statement: "Apply knowledge and understanding to analyse and solve computer-science problems.", weightingPercent: 30, status: "draft" },
  { id: "9618-AO3", syllabusId: "cambridge-9618", statement: "Design, program and evaluate computer-based solutions and make reasoned judgements.", weightingPercent: 20, status: "draft" },
];

export const CAMBRIDGE_9618_EXAM_REQUIREMENTS: CambridgeExamRequirement[] = [
  { id: "9618-as-paper-1", syllabusId: "cambridge-9618", requirement: "AS Paper 1 assesses Sections 1-8 through an external written theory paper.", status: "draft" },
  { id: "9618-as-paper-2", syllabusId: "cambridge-9618", requirement: "AS Paper 2 assesses Sections 9-12 and tests problem-solving/programming skills using pseudocode rather than requiring programming code.", status: "draft" },
  { id: "9618-a-paper-3", syllabusId: "cambridge-9618", requirement: "A Level Paper 3 assesses Sections 13-20 as an external written advanced-theory paper.", status: "draft" },
  { id: "9618-a-paper-4", syllabusId: "cambridge-9618", requirement: "A Level Paper 4 is a practical programming assessment focused on Sections 19-20, excluding low-level and declarative programming.", status: "draft" },
  { id: "9618-practical-languages", syllabusId: "cambridge-9618", requirement: "Centre programming experience should use Java console mode, Visual Basic console mode or Python console mode.", status: "draft" },
  { id: "9618-guided-hours", syllabusId: "cambridge-9618", requirement: "Cambridge designs the course around about 180 guided learning hours for AS and about 360 for the full A Level.", status: "draft" },
];

export const CAMBRIDGE_9618_COMMAND_WORDS = [
  "analyse", "assess", "calculate", "comment", "compare", "complete", "consider", "contrast", "define", "demonstrate", "describe", "develop", "discuss", "draw", "evaluate", "examine", "explain", "give", "identify", "justify", "outline", "predict", "sketch", "state", "suggest", "summarise", "write",
] as const;
