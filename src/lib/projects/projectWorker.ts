import type { ProjectRequirements, ProjectWorkPlan, StudentProject } from "./types";

export type ProjectWorkerKind = "report" | "research_pack" | "presentation" | "software" | "model" | "calculations" | "mixed";

export type ProjectWorkerTask = {
  id: string;
  kind: ProjectWorkerKind;
  title: string;
  purpose: string;
  inputs: string[];
  output: string;
  requiresLearnerEvidence: boolean;
  status: "ready" | "blocked" | "complete";
};

export type ProjectWorkerPlan = {
  projectId: string;
  generatedAt: string;
  tasks: ProjectWorkerTask[];
  blockers: string[];
  nextAction: string;
};

const has = (value: string, pattern: RegExp) => pattern.test(value.toLowerCase());

function task(kind: ProjectWorkerKind, title: string, purpose: string, inputs: string[], output: string, requiresLearnerEvidence = false): ProjectWorkerTask {
  return { id: `${kind}:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, kind, title, purpose, inputs, output, requiresLearnerEvidence, status: requiresLearnerEvidence ? "blocked" : "ready" };
}

/**
 * Converts the structured Project Studio intake into executable worker tasks.
 * This planner never invents real-world evidence. Tasks requiring observations,
 * measurements, interviews or physical construction remain blocked until the
 * learner supplies attributable evidence.
 */
export function buildProjectWorkerPlan(project: StudentProject): ProjectWorkerPlan {
  const r: ProjectRequirements = project.requirements ?? {
    deliverable: "", requiredSections: "", teacherRubric: "", constraints: "",
    materials: "", physicalWork: "", digitalWork: "", preferredFormat: "mixed", assistanceLevel: "build_with_me",
  };
  const plan: ProjectWorkPlan = project.workPlan ?? { generatedAt: new Date().toISOString(), summary: "", digitalTasks: [], physicalTasks: [], requiredEvidence: [], deliverables: [] };
  const tasks: ProjectWorkerTask[] = [];

  tasks.push(task("research_pack", "Build the research pack", "Organise the brief, rubric and permitted sources into a project-ready research pack.", [project.brief ?? "Teacher brief", r.teacherRubric, r.constraints], "Research pack with source slots and evidence checklist."));
  tasks.push(task("report", "Draft the project structure", "Create the required sections and map each section to evidence or an artefact.", [project.brief ?? "Brief", r.requiredSections, r.teacherRubric], "Editable project outline with evidence placeholders."));

  const text = `${project.subject} ${r.deliverable} ${r.digitalWork} ${r.physicalWork}`;
  if (has(text, /science|physics|chemistry|biology|experiment|laboratory|lab/)) {
    tasks.push(task("calculations", "Prepare the analysis workspace", "Prepare tables, calculation slots, graph specifications and analysis prompts without inventing results.", [r.physicalWork, r.requiredSections], "Analysis workspace awaiting real measurements.", true));
  }
  if (has(text, /geography|fieldwork|survey|questionnaire|interview|community/)) {
    tasks.push(task("research_pack", "Prepare the fieldwork pack", "Create the questionnaire/sampling structure and analysis template.", [r.physicalWork, r.constraints], "Fieldwork pack awaiting real responses or observations.", true));
  }
  if (has(text, /computer science|software|program|app|website|coding/)) {
    tasks.push(task("software", "Build the software specification", "Turn the brief into requirements, data structures, algorithms, tests and implementation tasks.", [project.brief ?? "Brief", r.requiredSections, r.constraints], "Editable software specification and implementation checklist."));
  }
  if (has(text, /model|prototype|design|technology|construction|artefact/)) {
    tasks.push(task("model", "Prepare the model/prototype specification", "Turn requirements into dimensions, materials, design alternatives and testing criteria.", [r.materials, r.constraints, r.physicalWork], "Build specification and test checklist.", true));
  }
  if (has(text, /business|economics|accounting|market|entrepreneur/)) {
    tasks.push(task("calculations", "Prepare the quantitative workspace", "Create calculation, table, chart and recommendation structures from the supplied requirements.", [project.brief ?? "Brief", r.constraints], "Analysis workbook specification awaiting real inputs.", true));
  }
  if (r.preferredFormat === "presentation" || r.preferredFormat === "mixed") {
    tasks.push(task("presentation", "Prepare the presentation", "Build a slide structure tied to the rubric and evidence.", [project.brief ?? "Brief", r.teacherRubric], "Editable presentation outline."));
  }
  if (r.preferredFormat === "report" || r.preferredFormat === "mixed") {
    tasks.push(task("report", "Prepare the report draft", "Create editable prose scaffolding while keeping unsupported findings as explicit placeholders.", [project.brief ?? "Brief", r.requiredSections], "Editable report draft with evidence placeholders."));
  }

  const blockers: string[] = [];
  if (!project.brief?.trim()) blockers.push("Teacher brief is missing.");
  if (!r.deliverable.trim()) blockers.push("Final deliverable is not specified.");
  blockers.push(...plan.requiredEvidence
    .filter((e) => /measurement|observation|interview|response|prototype|test/i.test(e))
    .map((e) => `Real evidence still required: ${e}`));
  if (r.physicalWork.trim()) blockers.push("Learner-owned physical work must be completed and evidenced before final claims are assembled.");

  const nextAction = blockers.length ? blockers[0] : tasks.find((t) => t.status === "ready")?.title ?? "Review the generated work plan.";
  return { projectId: project.id, generatedAt: new Date().toISOString(), tasks, blockers: [...new Set(blockers)], nextAction };
}
