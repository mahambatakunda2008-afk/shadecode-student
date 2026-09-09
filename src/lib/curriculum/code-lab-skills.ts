import type { CurriculumSkill, ObjectiveSkillMapping } from "./objective-first";
import {
  ZIMSEC_O_LEVEL_CS_4021_2024_2030,
  ZIMSEC_O_LEVEL_CS_4021_OBJECTIVES,
  ZIMSEC_O_LEVEL_CS_4021_FORM1_OBJECTIVES,
  ZIMSEC_O_LEVEL_CS_4021_FORM2_OBJECTIVES,
  ZIMSEC_O_LEVEL_CS_4021_FORM3_OBJECTIVES,
  ZIMSEC_O_LEVEL_CS_4021_FORM4_OBJECTIVES,
  ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
} from "./data/zimsec-o-level-computer-science-4021-2024-2030";

/**
 * Broad Code Lab capability library.
 *
 * These skills are intentionally board/level agnostic. Curriculum data decides
 * which skills are required for a particular learner and syllabus.
 */
export const CODE_LAB_SKILLS: CurriculumSkill[] = [
  { id: "computational-thinking", name: "Computational Thinking", description: "Decomposition, abstraction, patterns and structured problem solving." },
  { id: "algorithms", name: "Algorithms", description: "Algorithm design, sequence, selection, repetition, tracing and correction." },
  { id: "pseudocode", name: "Pseudocode", description: "Write, trace, correct and translate structured pseudocode." },
  { id: "programming", name: "Programming", description: "Implement computational solutions using an appropriate programming language." },
  { id: "testing-debugging", name: "Testing & Debugging", description: "Test programs systematically, diagnose faults and correct errors." },
  { id: "data-representation", name: "Data Representation", description: "Represent and manipulate data in forms used by computer systems." },
  { id: "databases", name: "Databases", description: "Design, create, query, secure and integrate databases." },
  { id: "web-development", name: "Web Development", description: "Create, customise, test and secure web experiences." },
  { id: "systems-analysis", name: "Systems Analysis & Design", description: "Analyse requirements and design data flow, interfaces and system structures." },
  { id: "project-development", name: "Computer Projects", description: "Investigate, design, implement, present and evaluate complete solutions." },
  { id: "cyber-safety-ethics", name: "Cyber Safety & Ethics", description: "Use technology safely and reason about legal, ethical and social impacts." },
  { id: "information-research", name: "Information Research", description: "Conduct and evaluate research using digital information sources." },
  { id: "technopreneurship", name: "Technopreneurship", description: "Apply computing ideas to business, innovation and technology ventures." },
  { id: "robotics", name: "Autonomous Robotics", description: "Design, develop and deploy autonomous robotic systems." },
];

const skill = (objectiveId: string, skillId: string): ObjectiveSkillMapping => ({
  objectiveId,
  skillId,
  status: "draft",
  provenance: ZIMSEC_O_LEVEL_CS_4021_PROVENANCE,
});

const byCode = (code: string) =>
  [...ZIMSEC_O_LEVEL_CS_4021_OBJECTIVES, ...ZIMSEC_O_LEVEL_CS_4021_FORM1_OBJECTIVES,
    ...ZIMSEC_O_LEVEL_CS_4021_FORM2_OBJECTIVES, ...ZIMSEC_O_LEVEL_CS_4021_FORM3_OBJECTIVES,
    ...ZIMSEC_O_LEVEL_CS_4021_FORM4_OBJECTIVES]
    .find((objective) => objective.code === code)?.id;

/**
 * Draft ZIMSEC mappings. These describe the intended Code Lab skill layer,
 * but are not yet exam-verified because the source syllabus has not been
 * independently retrieved from the official ZIMSEC document store.
 */
export const ZIMSEC_O_LEVEL_CS_4021_OBJECTIVE_SKILL_MAPPINGS: ObjectiveSkillMapping[] = [
  ["4.4", "programming"],
  ["4.4", "project-development"],
  ["4.5", "computational-thinking"],
  ["4.6", "systems-analysis"],
  ["4.7", "information-research"],
  ["4.8", "programming"],
  ["4.8", "project-development"],
  ["4.9", "information-research"],
  ["4.10", "robotics"],
  ["8.6.a", "systems-analysis"],
  ["8.6.b", "systems-analysis"],
  ["8.7.a", "algorithms"],
  ["8.7.b", "algorithms"],
  ["8.7.c", "algorithms"],
  ["8.7.d", "algorithms"],
  ["8.8.a", "programming"],
  ["8.8.b", "programming"],
  ["8.8.c", "programming"],
  ["8.9.a", "databases"],
  ["8.9.b", "databases"],
  ["8.9.c", "databases"],
  ["8.10.a", "web-development"],
  ["8.10.b", "web-development"],
  ["8.10.c", "web-development"],
  ["8.10.d", "web-development"],
  ["8.5.a", "cyber-safety-ethics"],
  ["8.5.b", "cyber-safety-ethics"],
  ["8.5.c", "cyber-safety-ethics"],
  ["8.5.d", "cyber-safety-ethics"],
  ["8.5.e", "cyber-safety-ethics"],
  ["8.11.a", "technopreneurship"],
  ["8.11.b", "technopreneurship"],
  ["8.11.c", "technopreneurship"],
  ["8.11.d", "technopreneurship"],
].flatMap(([code, skillId]) => {
  const objectiveId = byCode(code);
  return objectiveId ? [skill(objectiveId, skillId)] : [];
});

export const ZIMSEC_CODE_LAB_CURRICULUM_CONTEXT = {
  curriculum: ZIMSEC_O_LEVEL_CS_4021_2024_2030,
  objectives: [
    ...ZIMSEC_O_LEVEL_CS_4021_OBJECTIVES,
    ...ZIMSEC_O_LEVEL_CS_4021_FORM1_OBJECTIVES,
    ...ZIMSEC_O_LEVEL_CS_4021_FORM2_OBJECTIVES,
    ...ZIMSEC_O_LEVEL_CS_4021_FORM3_OBJECTIVES,
    ...ZIMSEC_O_LEVEL_CS_4021_FORM4_OBJECTIVES,
  ],
  skills: CODE_LAB_SKILLS,
  mappings: ZIMSEC_O_LEVEL_CS_4021_OBJECTIVE_SKILL_MAPPINGS,
};
