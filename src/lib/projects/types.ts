export type ProjectAcademicStage = "foundation" | "secondary" | "advanced" | "tertiary";

export type ProjectStatus = "planning" | "active" | "review" | "completed";

export type ProjectEvidenceType =
  | "note"
  | "observation"
  | "interview"
  | "questionnaire"
  | "measurement"
  | "calculation"
  | "photo"
  | "sketch"
  | "source"
  | "prototype"
  | "teacher_feedback"
  | "presentation";

export type ProjectStage = {
  id: string;
  title: string;
  description: string;
  learnerAction: string;
  evidencePrompt: string;
};

export type ProjectEvidence = {
  id: string;
  type: ProjectEvidenceType;
  title: string;
  content: string;
  createdAt: string;
  stageId: string;
  source: "learner" | "teacher" | "imported";
};

/**
 * The project intake is deliberately richer than a title + brief. It is the
 * contract Cortex needs to produce useful scaffolding, documents, models and
 * code while keeping real-world evidence and physical actions learner-owned.
 */
export type ProjectRequirements = {
  deliverable: string;
  requiredSections: string;
  teacherRubric: string;
  constraints: string;
  materials: string;
  physicalWork: string;
  digitalWork: string;
  preferredFormat: "report" | "model" | "prototype" | "presentation" | "software" | "mixed";
  assistanceLevel: "coach" | "build_with_me" | "prepare_draft";
};

export type ProjectWorkPlan = {
  generatedAt: string;
  summary: string;
  digitalTasks: string[];
  physicalTasks: string[];
  requiredEvidence: string[];
  deliverables: string[];
};

export type ProjectOutline = {
  problem: string;
  objectives: string;
  methodology: string;
  findings: string;
  conclusion: string;
  reflection: string;
};

export type StudentProject = {
  id: string;
  title: string;
  subject: string;
  board: string;
  academicStage: ProjectAcademicStage;
  gradeOrForm?: string;
  brief?: string;
  requirements?: ProjectRequirements;
  workPlan?: ProjectWorkPlan;
  status: ProjectStatus;
  dueDate?: string;
  currentStageId: string;
  stages: ProjectStage[];
  evidence: ProjectEvidence[];
  outline?: ProjectOutline;
  createdAt: string;
  updatedAt: string;
};

export const DEFAULT_PROJECT_REQUIREMENTS: ProjectRequirements = {
  deliverable: "",
  requiredSections: "",
  teacherRubric: "",
  constraints: "",
  materials: "",
  physicalWork: "",
  digitalWork: "",
  preferredFormat: "mixed",
  assistanceLevel: "build_with_me",
};

export const ZIMBABWE_SBA_PROJECT_STAGES: ProjectStage[] = [
  {
    id: "problem",
    title: "Identify the problem",
    description: "Clearly define the real problem, need, or opportunity your project will address.",
    learnerAction: "Describe who or what is affected and why the problem matters.",
    evidencePrompt: "Record your observations, initial notes, or teacher-approved evidence.",
  },
  {
    id: "investigation",
    title: "Investigate",
    description: "Find out what is already known and gather relevant evidence.",
    learnerAction: "Research, observe, measure, interview, or collect data as appropriate to the project.",
    evidencePrompt: "Save the sources, observations, responses, measurements, and notes you actually collected.",
  },
  {
    id: "ideas",
    title: "Generate possible solutions",
    description: "Develop several realistic ideas before choosing one.",
    learnerAction: "Create and compare possible solutions using evidence from your investigation.",
    evidencePrompt: "Keep sketches, alternatives, comparison notes, calculations, or design ideas.",
  },
  {
    id: "develop",
    title: "Develop and refine",
    description: "Select a solution and improve it using testing, feedback, and evidence.",
    learnerAction: "Build, model, test, revise, or otherwise develop the chosen solution.",
    evidencePrompt: "Record real tests, changes, feedback, measurements, prototypes, and decisions.",
  },
  {
    id: "present",
    title: "Present",
    description: "Communicate your project, process, evidence, and outcome clearly.",
    learnerAction: "Prepare the final project and practise explaining your work.",
    evidencePrompt: "Attach the final artefact or presentation evidence and note what you will explain.",
  },
  {
    id: "evaluate",
    title: "Evaluate and reflect",
    description: "Judge the outcome honestly and identify improvements and recommendations.",
    learnerAction: "Explain what worked, what did not, what the evidence shows, and what you would change.",
    evidencePrompt: "Record your own evaluation, limitations, teacher feedback, and recommendations.",
  },
];

export function stageLabel(stage: ProjectStage, index: number): string {
  return `Stage ${index + 1}: ${stage.title}`;
}
