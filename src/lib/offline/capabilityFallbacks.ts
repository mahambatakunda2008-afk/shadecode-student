import type { OfflineAICapability } from "./aiCapability";

export type OfflineFallback = {
  capability: OfflineAICapability;
  available: true;
  kind: "workflow" | "template" | "content";
  message: string;
};

export function getOfflineFallback(capability: OfflineAICapability): OfflineFallback {
  switch (capability) {
    case "project-coach":
      return { capability, available: true, kind: "workflow", message: "Project workflow, milestones, evidence checklist and integrity guidance remain available offline." };
    case "study-planner":
      return { capability, available: true, kind: "workflow", message: "Use the local timetable, task priorities and revision planner without AI." };
    case "question-generator":
      return { capability, available: true, kind: "template", message: "Generate from installed curriculum question banks and deterministic templates." };
    case "summarizer":
      return { capability, available: true, kind: "content", message: "Use locally stored content and supported extraction/condensation tools." };
    case "tutor":
      return { capability, available: true, kind: "content", message: "Use installed lessons, worked examples, hints and curriculum explanations while offline." };
  }
}
