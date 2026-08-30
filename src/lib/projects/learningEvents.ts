import { emitLearningEvent } from "@/lib/intelligence/emitLearningEvent";

export function emitProjectEvidenceAdded(projectId: string, evidenceId: string, stageId: string, subject?: string) {
  return emitLearningEvent({
    source: "project-studio",
    sourceEventId: `evidence:${evidenceId}`,
    type: "project.evidence_added",
    entityId: projectId,
    subjectId: subject,
    metadata: { stageId, evidenceId },
  });
}

export function emitProjectStageCompleted(projectId: string, stageId: string, nextStageId?: string, subject?: string) {
  return emitLearningEvent({
    source: "project-studio",
    sourceEventId: `stage-complete:${projectId}:${stageId}`,
    type: "project.stage_completed",
    entityId: projectId,
    subjectId: subject,
    metadata: { stageId, nextStageId: nextStageId ?? null },
  });
}
