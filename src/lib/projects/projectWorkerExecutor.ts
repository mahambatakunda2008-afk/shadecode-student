import type { StudentProject } from "./types";
import { buildProjectWorkerPlan, type ProjectWorkerPlan, type ProjectWorkerTask } from "./projectWorker";

export type GeneratedProjectArtifact = {
  id: string;
  taskId: string;
  kind: ProjectWorkerTask["kind"];
  title: string;
  status: "draft";
  provenance: "shadecode-generated";
  content: string;
  editable: true;
  generatedAt: string;
};

const bullets = (items: string[]) => items.filter(Boolean).map((x) => `- ${x}`).join("\n");

/** Generate safe, editable scaffolding for a worker task. It deliberately uses
 * placeholders instead of fabricating real-world findings. LLM execution can
 * replace this deterministic scaffold later without changing the contract. */
export function executeProjectWorkerTask(project: StudentProject, task: ProjectWorkerTask): GeneratedProjectArtifact {
  const r = project.requirements;
  const brief = project.brief?.trim() || "[Teacher brief required]";
  let content = "";
  switch (task.kind) {
    case "research_pack":
      content = `# ${task.title}\n\n## Brief\n${brief}\n\n## Research questions\n${bullets(["What does the assignment require?", "Which claims need authoritative sources?", "What evidence is required from the learner?"])}\n\n## Source log\n| Source | Key point | Used in | Verified? |\n|---|---|---|---|\n| [Add source] | [Add finding] | [Section] | [ ] |\n\n## Evidence boundary\nDo not replace real observations, measurements, interviews or experimental results with generated text.`;
      break;
    case "report":
      content = `# ${project.title || "Project Report"}\n\n## Introduction\n[Explain the problem, context and purpose.]\n\n## Objectives\n${r?.requiredSections || "[Add objectives from the brief]"}\n\n## Method / Approach\n[Describe what was actually done. Do not invent procedures.]\n\n## Results\n[Insert learner-owned results, tables and graphs.]\n\n## Discussion\n[Interpret the supplied results.]\n\n## Conclusion\n[Answer the project question using the evidence.]\n\n## References\n[Add verified sources.]`;
      break;
    case "presentation":
      content = `# Presentation outline\n\n1. Title and project question\n2. Background / problem\n3. Objectives\n4. Method / approach\n5. Evidence and results\n6. Analysis\n7. Recommendations / solution\n8. Conclusion\n9. References\n\nSpeaker notes should explain the learner's real work and evidence.`;
      break;
    case "software":
      content = `# Software specification\n\n## Problem\n${brief}\n\n## Functional requirements\n${bullets(["[Requirement 1]", "[Requirement 2]", "[Requirement 3]"])}\n\n## Data / inputs\n[Define inputs and validation.]\n\n## Outputs\n[Define expected outputs.]\n\n## Algorithms\n[Pseudocode / flowchart.]\n\n## Testing\n| Test | Input | Expected | Actual | Pass? |\n|---|---|---|---|---|\n| 1 | [input] | [expected] | [actual] | [ ] |\n\n## Evaluation\n[Explain strengths, limitations and improvements.]`;
      break;
    case "model":
      content = `# Model / prototype specification\n\n## Requirements\n${r?.constraints || "[Add constraints/specifications]"}\n\n## Materials\n${r?.materials || "[List materials]"}\n\n## Design alternatives\n[Describe alternatives before selecting one.]\n\n## Build instructions\n[Steps for the learner to carry out.]\n\n## Testing\n[Record real tests and observations here.]`;
      break;
    case "calculations":
      content = `# Analysis workspace\n\n## Given data\n[Insert real measurements/responses.]\n\n## Formulae / assumptions\n[Record the formula and why it applies.]\n\n## Calculations\n[Show working.]\n\n## Tables / graphs\n[Insert or generate from supplied data.]\n\n## Analysis\n[Interpret patterns and anomalies from the supplied evidence.]`;
      break;
    default:
      content = `# ${task.title}\n\n${task.purpose}\n\n## Inputs\n${bullets(task.inputs)}\n\n## Output\n${task.output}\n\n[Complete this editable draft.]`;
  }
  return { id: `artifact:${project.id}:${task.id}`, taskId: task.id, kind: task.kind, title: task.title, status: "draft", provenance: "shadecode-generated", content, editable: true, generatedAt: new Date().toISOString() };
}

export function executeProjectWorker(project: StudentProject): { plan: ProjectWorkerPlan; artifacts: GeneratedProjectArtifact[] } {
  const plan = buildProjectWorkerPlan(project);
  const artifacts = plan.tasks.filter((t) => t.status === "ready").map((t) => executeProjectWorkerTask(project, t));
  return { plan, artifacts };
}
