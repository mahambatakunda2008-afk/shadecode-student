import type { WorkAssessment, WorkObject } from "./types";

export type LearningActionType = "lesson" | "practice" | "workmate" | "review";

export type LearningAction = {
  type: LearningActionType;
  title: string;
  reason: string;
  subject?: string;
  topic?: string;
  priority: "high" | "medium" | "low";
};

function topicsFrom(work: WorkObject): string[] {
  const values = [work.topic, ...(work.assessment?.weakAreas ?? [])].filter(Boolean) as string[];
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function actionFor(work: WorkObject, topic: string, index: number): LearningAction {
  if (work.mode === "lesson") {
    return {
      type: "practice",
      title: `Practise ${topic}`,
      reason: "Use the lesson context to turn new knowledge into retrieval and application.",
      subject: work.subject,
      topic,
      priority: index === 0 ? "high" : "medium",
    };
  }

  if (work.assessment?.percentage !== undefined && work.assessment.percentage < 60) {
    return {
      type: "lesson",
      title: `Review ${topic}`,
      reason: "Recent assessment evidence suggests this area needs reteaching before more practice.",
      subject: work.subject,
      topic,
      priority: index === 0 ? "high" : "medium",
    };
  }

  if (work.mode === "workmate") {
    return {
      type: "practice",
      title: `Practise ${topic}`,
      reason: "Workmate identified an area where another independent attempt can strengthen understanding.",
      subject: work.subject,
      topic,
      priority: index === 0 ? "high" : "medium",
    };
  }

  return {
    type: "review",
    title: `Review ${topic}`,
    reason: "Use the recorded weak area for a short targeted review.",
    subject: work.subject,
    topic,
    priority: index === 0 ? "high" : "medium",
  };
}

export function recommendNextActions(work: WorkObject, assessment?: WorkAssessment): LearningAction[] {
  const evidence = assessment ?? work.assessment;
  const enriched = evidence && evidence !== work.assessment ? { ...work, assessment: evidence } : work;
  const topics = topicsFrom(enriched);

  if (topics.length > 0) return topics.slice(0, 3).map((topic, index) => actionFor(enriched, topic, index));

  if (evidence?.percentage !== undefined && evidence.percentage >= 80) {
    return [{
      type: "practice",
      title: "Try a harder challenge",
      reason: "Strong recent performance suggests the student can increase difficulty.",
      subject: work.subject,
      topic: work.topic,
      priority: "medium",
    }];
  }

  return [{
    type: "workmate",
    title: "Work through another problem",
    reason: "There is not enough evidence for a targeted recommendation yet.",
    subject: work.subject,
    topic: work.topic,
    priority: "low",
  }];
}
