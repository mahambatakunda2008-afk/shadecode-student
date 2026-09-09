import type {
  CurriculumIdentity,
  CurriculumObjective,
  CurriculumProvenance,
} from "../objective-first";

/**
 * ZIMSEC O Level Computer Science 4021, 2024-2030.
 *
 * These records were extracted from a 2024-2030 Forms 1-4 syllabus
 * transcription and cross-checked against its competency-matrix structure.
 * They remain `draft` until the official ZIMSEC-hosted syllabus PDF is
 * independently retrieved. The Code Lab guard therefore cannot surface them
 * as exam-required content yet.
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
  authority:
    "Zimbabwe School Examinations Council / Ministry of Primary and Secondary Education",
  sourceDocument: "Computer Science Syllabus Forms 1-4, 2024-2030",
  sourceUrl: "https://www5.zimsec.co.zw/syllabi/",
  sectionOrPage: "Sections 4, 6, 7 and 8; competency matrix",
  retrievedAt: "2026-09-09",
  mappingStatus: "reviewed",
};

export const ZIMSEC_O_LEVEL_CS_4021_OBJECTIVES: CurriculumObjective[] = [
  ["4.1", "Describe a range of information processing systems."],
  ["4.2", "Explain the effects of introducing information processing systems to individuals and organisations."],
  ["4.3", "Explain the functions of individual hardware and software components of ICT systems and their interrelationship."],
  ["4.4", "Use computers sensibly to generate, implement and document solutions appropriately."],
  ["4.5", "Demonstrate techniques used to solve real-life problems using technology."],
  ["4.6", "Analyse ICT applications in terms of data flow and system requirements."],
  ["4.7", "Analyse, evaluate, make reasoned judgments and present conclusions using technology."],
  ["4.8", "Demonstrate proficiency in the creation, design and implementation of computer solutions using programming packages."],
  ["4.9", "Conduct research using the internet."],
  ["4.10", "Design, develop and deploy autonomous robotic systems using computer science concepts to solve real-world problems while considering social, ethical and environmental implications."],
].map(([code, statement]) => ({
  id: `zimsec-4021-obj-${code.replace(".", "-")}`,
  curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
  code,
  statement,
  status: "draft",
  provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
}));

/** Topic inventory. Topics are curriculum areas, not objective mappings. */
export const ZIMSEC_O_LEVEL_CS_4021_TOPICS = [
  "hardware-and-software",
  "application-of-computer-science",
  "data-representation",
  "communication-networks-and-internet-technologies",
  "security-and-ethics",
  "systems-analysis-and-design",
  "algorithm-design-and-problem-solving",
  "programming",
  "databases",
  "web-design",
  "technopreneurship",
] as const;

/** First implementation slice of competency-matrix objectives. */
export const ZIMSEC_O_LEVEL_CS_4021_FORM1_OBJECTIVES: CurriculumObjective[] = [
  ["8.1.a", "Explain how hardware devices work."],
  ["8.1.b", "Connect hardware devices."],
  ["8.1.c", "Identify types of software."],
  ["8.2.a", "Describe areas of computer applications."],
  ["8.3.a", "Outline the concept of the binary number system."],
  ["8.3.b", "Recognise the use and importance of binary numbers in computer systems."],
  ["8.4.a", "Outline the concept of computer networks."],
  ["8.4.b", "Describe network topologies."],
  ["8.4.c", "Use Internet services."],
  ["8.5.a", "Outline the characteristics of cyber culture and its impact."],
  ["8.5.b", "Describe the characteristics of safe and unsafe sites."],
  ["8.5.c", "Suggest effects of online content and behaviour."],
  ["8.5.d", "Explain the importance of copyrights."],
  ["8.5.e", "Describe consequences of plagiarism and piracy."],
  ["8.6.a", "Outline the stages in the systems development life cycle."],
  ["8.6.b", "Identify problems of an existing system."],
  ["8.7.a", "Define an algorithm."],
  ["8.7.b", "Explain the purpose of algorithms."],
  ["8.7.c", "Explain the sequence construct."],
  ["8.7.d", "Apply the sequence algorithm structure."],
  ["8.8.a", "Explain the syntax and semantics of a programming language."],
  ["8.8.b", "Declare variables and constants."],
  ["8.8.c", "Apply operators to solve problems."],
  ["8.9.a", "Create a database."],
  ["8.9.b", "Create a file structure."],
  ["8.9.c", "Design forms, reports and queries."],
  ["8.10.a", "Navigate a webpage."],
  ["8.10.b", "Customise web pages."],
  ["8.10.c", "Use webpage templates to create web pages."],
  ["8.10.d", "Generate web content."],
  ["8.11.a", "Describe the elements of intellectual capital."],
  ["8.11.b", "Explain the attributes of business ethics."],
  ["8.11.c", "Identify marketing and business strategy elements."],
  ["8.11.d", "Explain the elements of marketing and business strategies."],
].map(([code, statement]) => ({
  id: `zimsec-4021-form1-${code.replace(".", "-")}`,
  curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
  code,
  statement,
  status: "draft",
  provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
}));
