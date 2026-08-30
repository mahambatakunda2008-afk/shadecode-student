export type ProjectArtifactProvenance = "shadecode-generated" | "learner-authored" | "learner-evidence" | "teacher-provided";

export type ProjectArtifactRecord = {
  id: string;
  projectId: string;
  title: string;
  kind: string;
  provenance: ProjectArtifactProvenance;
  editable: boolean;
  contentRef?: string;
  createdAt: string;
  updatedAt: string;
};

export function canBeUsedAsRealWorldEvidence(provenance: ProjectArtifactProvenance): boolean {
  return provenance === "learner-evidence" || provenance === "teacher-provided";
}

export function assertEvidenceProvenance(provenance: ProjectArtifactProvenance): void {
  if (!canBeUsedAsRealWorldEvidence(provenance)) {
    throw new Error("Generated or learner-authored drafts cannot be represented as real-world evidence.");
  }
}
