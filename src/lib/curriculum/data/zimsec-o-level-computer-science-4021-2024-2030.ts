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

const toObjectives = (
  form: number,
  records: Array<[string, string]>,
): CurriculumObjective[] =>
  records.map(([code, statement]) => ({
    id: `zimsec-4021-form${form}-${code.replace(".", "-")}`,
    curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
    code,
    statement,
    status: "draft",
    provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  }));

/** Form 1 competency-matrix objectives. */
export const ZIMSEC_O_LEVEL_CS_4021_FORM1_OBJECTIVES: CurriculumObjective[] = toObjectives(1, [
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
]);

/** Form 2 competency-matrix objectives. */
export const ZIMSEC_O_LEVEL_CS_4021_FORM2_OBJECTIVES: CurriculumObjective[] = toObjectives(2, [
  ["8.12.a", "Identify types of application software."],
  ["8.12.b", "Use utility software and tools."],
  ["8.13.a", "Describe areas of computer applications."],
  ["8.14.a", "Convert numbers from one base to another."],
  ["8.14.b", "Convert keyboard characters to ASCII code."],
  ["8.14.c", "Add binary numbers."],
  ["8.14.d", "Subtract binary numbers."],
  ["8.15.a", "Explain data transmission modes and media."],
  ["8.15.b", "Describe types of networks and Internet service providers."],
  ["8.16.a", "Apply data protection measures."],
  ["8.16.b", "Explain the impact of unethical practices."],
  ["8.17.a", "Carry out a feasibility study."],
  ["8.18.a", "Explain selection and repetition constructs."],
  ["8.18.b", "Apply selection and repetition algorithm structures in problem solving."],
  ["8.19.a", "Develop programs that use pseudo code structures."],
  ["8.19.b", "Develop a program using functions."],
  ["8.19.c", "Test and debug programs."],
  ["8.20.a", "Develop databases using database objects and views."],
  ["8.20.b", "Edit database objects."],
  ["8.20.c", "Apply database security controls."],
  ["8.21.a", "Use Content Management System (CMS) templates to create websites."],
  ["8.21.b", "Customize websites."],
  ["8.21.c", "Generate content using a graphics design package."],
  ["8.21.d", "Apply the concept of debugging and testing."],
  ["8.21.e", "Use plugins and extensions in web development."],
  ["8.22.a", "Describe technopreneurship components."],
]);

/** Form 3 competency-matrix objectives. */
export const ZIMSEC_O_LEVEL_CS_4021_FORM3_OBJECTIVES: CurriculumObjective[] = toObjectives(3, [
  ["8.23.a", "Identify the various applications of hardware devices."],
  ["8.23.b", "Compare different operating systems."],
  ["8.23.c", "Explain the functions of an operating system."],
  ["8.24.a", "Describe areas of computer applications."],
  ["8.25.a", "Outline units of storage."],
  ["8.25.b", "Convert denary numbers to octal and hexadecimal."],
  ["8.26.a", "Identify types of mobile technologies."],
  ["8.26.b", "Describe the role of mobile technologies in communication."],
  ["8.26.c", "Explain the application of wireless technologies."],
  ["8.26.d", "Explain the concept of cloud computing services."],
  ["8.27.a", "Apply data privacy measures."],
  ["8.27.b", "Verify and validate data."],
  ["8.27.c", "Set up a firewall."],
  ["8.27.d", "Apply network security measures."],
  ["8.27.e", "Identify online crimes."],
  ["8.28.a", "Describe the activities involved in the analysis stage."],
  ["8.28.b", "Apply system analysis on projects."],
  ["8.28.c", "Describe the activities involved in the design stage."],
  ["8.28.d", "Design input, output and user interface for the project."],
  ["8.28.e", "Design file structures and tables."],
  ["8.28.f", "Construct system flow charts and pseudo codes."],
  ["8.28.g", "Explain activities involved in the development and testing stage."],
  ["8.29.a", "Design flow charts and construct pseudo codes."],
  ["8.29.b", "Use a top-down approach to represent an algorithm."],
  ["8.29.c", "Use trace tables to dry run algorithms."],
  ["8.29.d", "Correct errors in an algorithm."],
  ["8.30.a", "Create user interfaces."],
  ["8.30.b", "Declare functions."],
  ["8.30.c", "Use objects in interface design."],
  ["8.30.d", "Test and debug programs."],
  ["8.30.e", "Identify types of errors."],
  ["8.30.f", "Apply error handling techniques in programming."],
  ["8.31.a", "Create relational databases."],
  ["8.31.b", "Design forms and reports."],
  ["8.31.c", "Create queries."],
  ["8.31.d", "Import and export data."],
  ["8.31.e", "Apply database security."],
  ["8.32.a", "Use Content Management System (CMS) templates to create websites."],
  ["8.32.b", "Customize websites."],
  ["8.32.c", "Generate content using graphic design packages."],
  ["8.32.d", "Integrate web security in web designing."],
  ["8.33.a", "Identify laws that govern technopreneurship."],
  ["8.33.b", "Describe intellectual property rights."],
]);

/** Form 4 competency-matrix objectives. */
export const ZIMSEC_O_LEVEL_CS_4021_FORM4_OBJECTIVES: CurriculumObjective[] = toObjectives(4, [
  ["8.34.a", "Replace malfunctioning components."],
  ["8.34.b", "Troubleshoot and fix common software and hardware problems."],
  ["8.35.a", "Design models of agricultural systems, ambient systems and Geographic Information Systems."],
  ["8.36.a", "Represent logic gates using symbols."],
  ["8.36.b", "Construct truth tables."],
  ["8.36.c", "Model electronic circuits using logic gates."],
  ["8.37.a", "Explain network protocols."],
  ["8.37.b", "Explain functions of networking devices."],
  ["8.37.c", "Design a network model."],
  ["8.37.d", "Configure a network."],
  ["8.38.a", "Back up files."],
  ["8.38.b", "Formulate a recovery plan."],
  ["8.38.c", "Use data recovery tools."],
  ["8.39.a", "Describe the types of documentation and their contents."],
  ["8.39.b", "Outline the importance of user training in carrying out a project."],
  ["8.39.c", "Describe the activities involved in the implementation, evaluation and maintenance stages."],
  ["8.40.a", "Design algorithms."],
  ["8.41.a", "Develop project modules using programming concepts."],
  ["8.41.b", "Code using programming concepts."],
  ["8.41.c", "Test and debug programs."],
  ["8.42.a", "Create queries based on multiple tables."],
  ["8.42.b", "Link a database to project modules."],
  ["8.42.c", "Apply security measures to a database."],
  ["8.43.a", "Develop websites using web development tools."],
  ["8.43.b", "Apply security measures in web development."],
  ["8.43.c", "Test and debug a web application."],
  ["8.44.a", "Outline financial resource components."],
  ["8.44.b", "Identify ideal conditions for business location."],
]);

/** Flat objective inventory for curriculum-aware consumers. */
export const ZIMSEC_O_LEVEL_CS_4021_ALL_COMPETENCY_OBJECTIVES: CurriculumObjective[] = [
  ...ZIMSEC_O_LEVEL_CS_4021_FORM1_OBJECTIVES,
  ...ZIMSEC_O_LEVEL_CS_4021_FORM2_OBJECTIVES,
  ...ZIMSEC_O_LEVEL_CS_4021_FORM3_OBJECTIVES,
  ...ZIMSEC_O_LEVEL_CS_4021_FORM4_OBJECTIVES,
];
