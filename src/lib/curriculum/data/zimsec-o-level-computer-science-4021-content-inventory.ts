import type { LearningContentItem } from "../../code-lab/learning-scope";
import {
  ZIMSEC_O_LEVEL_CS_4021_2024_2030,
  ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
} from "./zimsec-o-level-computer-science-4021-2024-2030";

/**
 * Candidate 2024-2030 content inventory for ZIMSEC Computer Science 4021.
 *
 * This is intentionally NOT marked verified. It is derived from a readable
 * secondary copy of the 2024-2030 syllabus and is used to make the content
 * hierarchy explicit before an authoritative ZIMSEC copy is reconciled.
 */

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

const candidateSource = {
  ...ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
  sourceUrl: "https://studylib.net/doc/28527371/computer-science-o-level-syllabus",
  sectionOrPage: "2024-2030 syllabus copy; scope and sequence, competency matrix, assessment",
  mappingStatus: "reviewed" as const,
};

const forms: Record<number, Array<[string, string[]]>> = {
  1: [
    ["hardware-and-software", ["Input devices", "Output devices", "Storage devices", "Processing devices", "Software concepts"]],
    ["application-of-computer-science", ["Agriculture", "Banking systems", "Education", "Social networks", "Research and development"]],
    ["data-representation", ["Binary number system", "Data representation using binary"]],
    ["communication-networks-and-internet-technologies", ["Networking concepts", "Types of networks: LAN and WAN", "Network topologies: star, ring, bus and mesh", "Internet services: email, e-commerce, e-learning and social media"]],
    ["security-and-ethics", ["Cyber wellness", "Cyber use", "Handling online content and behaviour", "Online relationships", "Copyright issues", "Plagiarism and piracy"]],
    ["systems-analysis-and-design", ["Systems development life cycle", "Problem identification", "Preliminary investigation", "Data collection: questionnaire, interview, record inspection and observation"]],
    ["algorithm-design-and-problem-solving", ["Introduction to algorithm tools", "Sequence construct", "Dry running a sequence algorithm"]],
    ["programming", ["Program structure", "Variables and constants", "Data types: integer, character, string and boolean", "Arithmetic, logical and relational operators"]],
    ["databases", ["Database creation", "File structure elements", "Fields", "Data types", "Field size", "Data formats", "Validation rules and input masks", "Queries", "Forms", "Reports", "CRUD operations"]],
    ["web-design", ["Webpage elements", "Webpage templates", "Web content development"]],
    ["technopreneurship", ["Human capital", "Organisation capital", "Social capital", "Business ethics", "Marketing and business strategies", "E-commerce"]],
  ],
  2: [
    ["hardware-and-software", ["Application software", "Off-the-shelf software", "Customised software", "Open-source software", "System software", "Utility tools"]],
    ["application-of-computer-science", ["Agriculture", "Transport management", "Health", "Environmental management", "Robotics"]],
    ["data-representation", ["Conversion between number bases", "ASCII character codes", "Binary addition", "Binary subtraction"]],
    ["communication-networks-and-internet-technologies", ["Data transmission modes", "Simplex", "Half duplex", "Full duplex", "Data transmission media", "Twisted pair", "Coaxial", "Optic fibre", "Wireless", "LAN, WAN, PAN and MAN", "Internet service providers"]],
    ["security-and-ethics", ["Computer crime", "Data protection measures", "Passwords", "File permission modes", "Computer ethics"]],
    ["systems-analysis-and-design", ["Feasibility study"]],
    ["algorithm-design-and-problem-solving", ["Algorithm tools", "Selection construct", "Repetition construct"]],
    ["programming", ["Programming concepts", "Functions", "Testing and debugging", "Interface design"]],
    ["databases", ["Database objects and views", "Data manipulation methods", "Data analysis", "Database security"]],
    ["web-design", ["Content management systems", "Website templates", "Web content development", "Testing and debugging", "Plugins and extensions"]],
    ["technopreneurship", ["Environmental technopreneurship", "Technology innovation", "Design thinking"]],
  ],
  3: [
    ["hardware-and-software", ["Hardware devices", "Operating systems"]],
    ["application-of-computer-science", ["Agriculture", "Computer-aided manufacturing", "Intelligent systems", "Wildlife management", "Mining"]],
    ["data-representation", ["Units of storage", "Number bases", "Octal", "Hexadecimal", "Logic gates", "Truth tables"]],
    ["communication-networks-and-internet-technologies", ["Mobile technology", "Cloud services"]],
    ["security-and-ethics", ["Privacy and data integrity", "System security", "Cybercrime"]],
    ["systems-analysis-and-design", ["Systems analysis", "Systems design", "Development and testing"]],
    ["algorithm-design-and-problem-solving", ["Algorithm tools", "Interpreting algorithms", "Testing algorithms", "Algorithm design"]],
    ["programming", ["Interface design", "Visual programming", "Testing and debugging", "Types of errors", "Error handling"]],
    ["databases", ["Database objects and views", "External data sources", "Database security"]],
    ["web-design", ["CMS", "Graphic design", "Advertisements", "Web security", "Plugins and extensions"]],
    ["technopreneurship", ["Laws and policies on technopreneurship", "Intellectual property rights"]],
  ],
  4: [
    ["hardware-and-software", ["Hardware and software maintenance", "Replacing malfunctioning components", "Troubleshooting common software and hardware problems"]],
    ["application-of-computer-science", ["Agriculture", "Ambient systems", "Geographic Information Systems"]],
    ["data-representation", ["Logic gates", "Truth tables", "Logic-gate circuit models"]],
    ["communication-networks-and-internet-technologies", ["Network protocols", "Networking devices", "Network model design", "Network configuration"]],
    ["security-and-ethics", ["Data backup", "Disaster recovery plan", "Data recovery tools"]],
    ["systems-analysis-and-design", ["Documentation", "User training", "Implementation", "Evaluation", "Maintenance"]],
    ["algorithm-design-and-problem-solving", ["Algorithm design"]],
    ["programming", ["Coding programs", "Testing and debugging", "Project modules", "Programming concepts"]],
    ["databases", ["Advanced queries", "Database connection", "Database security", "Queries across multiple tables"]],
    ["web-design", ["Web development", "Web security", "Testing and debugging"]],
    ["technopreneurship", ["Finance and funding", "Market research"]],
  ],
};

export const ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_CONTENT_INVENTORY: LearningContentItem[] = Object.entries(forms).flatMap(([form, topics]) =>
  topics.flatMap(([topic, items]) => {
    const topicId = `zimsec-4021-form${form}-topic-${topic}`;
    const topicItem: LearningContentItem = {
      id: topicId,
      kind: "topic",
      code: `F${form}.${topic}`,
      title: topic.replaceAll("-", " "),
      content: topic.replaceAll("-", " "),
      status: "draft",
      identity,
      provenance: candidateSource,
      metadata: { form: Number(form), sourceType: "secondary-syllabus-copy" },
    };
    const childItems = items.map((content, index): LearningContentItem => ({
      id: `${topicId}-${index + 1}`,
      kind: "knowledge",
      title: content,
      content,
      parentId: topicId,
      status: "draft",
      identity,
      provenance: candidateSource,
      metadata: { form: Number(form), sourceType: "secondary-syllabus-copy" },
    }));
    return [topicItem, ...childItems];
  }),
);
