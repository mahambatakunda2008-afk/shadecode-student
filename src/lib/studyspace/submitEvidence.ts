import { emitCortexEvent } from "@/lib/cortex/events/emit";
import type { WorkObject } from "./types";
import { evidenceFromWork } from "./evidence";
import { saveWorkObject } from "./store";
import { updateTopicMasteryFromEvidence } from "./updateTopicMastery";

/**
 * Persists a submitted StudySpace work item and emits one stable Cortex
 * learning event. Cortex/mastery failures never prevent the local submission.
 */
export async function submitStudySpaceEvidence(
  work: WorkObject,
  userId: string,
): Promise<ReturnType<typeof evidenceFromWork>> {
  const evidence = evidenceFromWork(work);
  await saveWorkObject(work);

  void updateTopicMasteryFromEvidence(userId, evidence);

  emitCortexEvent({
    id: `studyspace:${evidence.id}`,
    userId,
    type: "studyspace.assessment.completed",
    source: "studyspace",
    data: {
      workId: evidence.workId,
      mode: evidence.source,
      subject: evidence.subject ?? null,
      topic: evidence.topic ?? null,
      outcome: evidence.outcome,
      score: evidence.score ?? null,
      percentage: evidence.percentage ?? null,
      timeSpentMs: evidence.timeSpentMs ?? null,
      weakAreas: JSON.stringify(evidence.weakAreas),
      strongAreas: JSON.stringify(evidence.strongAreas),
    },
  });

  return evidence;
}
