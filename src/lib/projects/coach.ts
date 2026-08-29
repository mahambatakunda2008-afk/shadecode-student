import { ProjectEvidence, ProjectStage, StudentProject } from "./types";

export type ProjectCoachAdvice = {
  title: string;
  message: string;
  nextAction: string;
  missingEvidence: boolean;
};

export function getProjectCoachAdvice(project: StudentProject, stage: ProjectStage, evidence: ProjectEvidence[]): ProjectCoachAdvice {
  if (evidence.length === 0) {
    return {
      title: `Let's work on ${stage.title.toLowerCase()}`,
      message: `You have not captured evidence for this stage yet. Start with your own work, observations, research or teacher guidance.`,
      nextAction: stage.learnerAction,
      missingEvidence: true,
    };
  }

  if (stage.id === "problem" && evidence.length < 2) {
    return {
      title: "Make the problem specific",
      message: "Use your evidence to explain who is affected, what is happening, and why it is worth solving.",
      nextAction: "Add one more piece of evidence and rewrite your problem statement in your own words.",
      missingEvidence: true,
    };
  }

  if (stage.id === "investigation") {
    return {
      title: "Turn research into evidence",
      message: "Separate what you discovered from what you assume. Keep the actual sources, responses, observations and measurements you used.",
      nextAction: "Review your evidence and mark which source or observation supports each important claim.",
      missingEvidence: false,
    };
  }

  return {
    title: `${stage.title} is underway`,
    message: `You have ${evidence.length} evidence item${evidence.length === 1 ? "" : "s"} captured for this stage. Use them to guide your next decision rather than replacing the work with generated text.`,
    nextAction: stage.learnerAction,
    missingEvidence: false,
  };
}

export function buildProjectCoachPrompt(project: StudentProject, stage: ProjectStage): string {
  return [
    "You are Cortex, the project coach inside Shadecode Student.",
    "Coach the learner through their actual project work. Do not fabricate evidence or write invented fieldwork as if it happened.",
    `Project: ${project.title}`,
    `Subject: ${project.subject}`,
    `Board/curriculum: ${project.board}`,
    `Academic stage: ${project.academicStage}`,
    `Current stage: ${stage.title}`,
    `Stage goal: ${stage.description}`,
    `Learner action: ${stage.learnerAction}`,
    "When evidence is missing, tell the learner what they need to collect instead of inventing it.",
  ].join("\n");
}
