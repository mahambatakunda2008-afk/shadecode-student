import type { ProjectRequirements, ProjectWorkPlan } from "./types";

const uniq = (items: string[]) => [...new Set(items.filter(Boolean))];

/**
 * Builds a deterministic first-pass production plan from the student's intake.
 * This is deliberately non-generative: it provides safe scaffolding immediately,
 * while a future AI worker can enrich individual tasks with teacher-approved context.
 */
export function buildProjectWorkPlan(
  subject: string,
  requirements: ProjectRequirements,
  now = new Date().toISOString(),
): ProjectWorkPlan {
  const text = `${subject} ${requirements.deliverable} ${requirements.digitalWork} ${requirements.physicalWork}`.toLowerCase();
  const digitalTasks: string[] = [];
  const physicalTasks: string[] = [];
  const requiredEvidence: string[] = [];
  const deliverables = requirements.deliverable
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  digitalTasks.push("Convert the teacher brief and rubric into a checklist.");
  digitalTasks.push("Create the project structure and required sections.");

  if (requirements.requiredSections.trim()) {
    digitalTasks.push("Map each required section to the evidence or artefact that will support it.");
  }
  if (requirements.teacherRubric.trim()) {
    digitalTasks.push("Create a rubric coverage matrix and mark each criterion as planned, evidenced, or still missing.");
  }
  if (requirements.digitalWork.trim()) {
    digitalTasks.push(`Prepare the requested digital work: ${requirements.digitalWork.trim()}`);
  }

  if (/(science|physics|chemistry|biology|experiment|laboratory|lab)/.test(text)) {
    digitalTasks.push("Prepare hypothesis, variables, method template, data table, calculations, graph plan, analysis and conclusion prompts.");
    physicalTasks.push("Perform the approved experiment and record real observations and measurements.");
    requiredEvidence.push("Raw measurements and observations", "Completed data table", "Experimental photographs where required");
  }
  if (/(geography|fieldwork|survey|questionnaire|interview|community)/.test(text)) {
    digitalTasks.push("Prepare sampling plan, questionnaire/interview template, coding scheme, charts and analysis framework.");
    physicalTasks.push("Collect the required responses, observations or field measurements in the real setting.");
    requiredEvidence.push("Completed responses or field notes", "Sampling record", "Location/observation evidence where required");
  }
  if (/(computer science|software|program|app|website|coding)/.test(text)) {
    digitalTasks.push("Define requirements, data structures, algorithms, pseudocode, implementation, tests and evaluation.");
    requiredEvidence.push("Source code", "Test results", "Screenshots or demonstration evidence");
  }
  if (/(model|prototype|design|technology|construction|artefact)/.test(text)) {
    digitalTasks.push("Prepare design specifications, alternatives, dimensions/materials list and build/test documentation.");
    physicalTasks.push("Build the physical model or prototype and document real construction and testing.");
    requiredEvidence.push("Design sketches", "Materials record", "Prototype photographs", "Test results");
  }
  if (/(business|economics|accounting|market|entrepreneur)/.test(text)) {
    digitalTasks.push("Prepare market-analysis structure, calculations, tables, charts, recommendations and presentation material.");
    physicalTasks.push("Collect any required real market responses, quotations, observations or interviews.");
    requiredEvidence.push("Source records", "Real market responses/quotations", "Financial calculations");
  }

  if (requirements.preferredFormat === "report" || requirements.preferredFormat === "mixed") {
    digitalTasks.push("Assemble a report draft with explicit placeholders for learner-owned evidence.");
  }
  if (requirements.preferredFormat === "presentation" || requirements.preferredFormat === "mixed") {
    digitalTasks.push("Build a presentation outline linked to the project evidence and rubric.");
  }
  if (requirements.preferredFormat === "model" || requirements.preferredFormat === "prototype") {
    digitalTasks.push("Create a build specification and testing checklist.");
  }

  if (requirements.materials.trim()) {
    physicalTasks.push(`Confirm and use only the available/approved materials: ${requirements.materials.trim()}`);
  }
  if (requirements.constraints.trim()) {
    digitalTasks.push(`Apply the stated constraints throughout the work: ${requirements.constraints.trim()}`);
  }
  if (requirements.physicalWork.trim()) {
    physicalTasks.push(`Complete the learner-owned physical work: ${requirements.physicalWork.trim()}`);
  }

  requiredEvidence.push("Teacher brief/rubric reference", "Final artefact or submission", "Learner reflection/evaluation");

  const assistance = requirements.assistanceLevel === "coach"
    ? "Cortex will guide rather than prepare finished work."
    : requirements.assistanceLevel === "prepare_draft"
      ? "Cortex may prepare editable digital drafts, clearly labelled for learner review."
      : "Cortex prepares reusable digital work with the learner reviewing and owning the final submission.";

  return {
    generatedAt: now,
    summary: `Production plan for ${subject || "this project"}. ${assistance}`,
    digitalTasks: uniq(digitalTasks),
    physicalTasks: uniq(physicalTasks),
    requiredEvidence: uniq(requiredEvidence),
    deliverables: uniq(deliverables.length ? deliverables : [requirements.preferredFormat === "mixed" ? "Project submission pack" : requirements.preferredFormat]),
  };
}
