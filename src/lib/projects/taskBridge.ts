import { StudentProject } from "./types";

export type ProjectTaskSeed = {
  title: string;
  description: string;
  projectId: string;
  stageId: string;
  source: "project-studio";
};

export function buildProjectTask(project: StudentProject): ProjectTaskSeed {
  const stage = project.stages.find((item) => item.id === project.currentStageId) ?? project.stages[0];
  return {
    title: `${project.title}: ${stage.title}`,
    description: stage.learnerAction,
    projectId: project.id,
    stageId: stage.id,
    source: "project-studio",
  };
}
