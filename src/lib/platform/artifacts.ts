/**
 * Shared artifact model for everything a learner creates or develops.
 *
 * Code, designs, documents, diagrams, spreadsheets, databases, lessons and
 * practical evidence all use the same identity/version/history boundary.
 */

export type ArtifactType =
  | "code-project"
  | "website"
  | "design"
  | "document"
  | "presentation"
  | "spreadsheet"
  | "database"
  | "diagram"
  | "flowchart"
  | "dataset"
  | "lesson"
  | "exam-response"
  | "science-practical"
  | "media"
  | "other";

export interface ArtifactFile {
  path: string;
  content: string;
  mimeType?: string;
  language?: string;
  binary?: boolean;
}

export interface ArtifactContext {
  board?: string | null;
  qualification?: string | null;
  level?: string | null;
  subject?: string | null;
  syllabusId?: string | null;
  objectiveIds?: string[];
}

export interface ArtifactEvidence {
  id: string;
  type: "test" | "run" | "submission" | "review" | "assessment" | "observation";
  label: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface ArtifactVersion {
  id: string;
  version: number;
  createdAt: string;
  authorId: string;
  summary: string;
  files?: ArtifactFile[];
  content?: string;
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  context: ArtifactContext;
  files: ArtifactFile[];
  tags: string[];
  collaborators: string[];
  capabilities: string[];
  evidence: ArtifactEvidence[];
  history: ArtifactVersion[];
  metadata: Record<string, unknown>;
}

export function createArtifact(input: {
  id: string;
  type: ArtifactType;
  title: string;
  ownerId: string;
  files?: ArtifactFile[];
  content?: string;
  context?: ArtifactContext;
  capabilities?: string[];
}): Artifact {
  const now = new Date().toISOString();
  const files = input.files ?? (input.content !== undefined ? [{ path: "main.txt", content: input.content }] : []);

  return {
    id: input.id,
    type: input.type,
    title: input.title,
    ownerId: input.ownerId,
    createdAt: now,
    updatedAt: now,
    version: 1,
    context: input.context ?? {},
    files,
    tags: [],
    collaborators: [],
    capabilities: input.capabilities ?? [],
    evidence: [],
    history: [],
    metadata: {},
  };
}

export function snapshotArtifact(artifact: Artifact, authorId: string, summary: string): ArtifactVersion {
  return {
    id: `${artifact.id}:v${artifact.version}:${Date.now()}`,
    version: artifact.version,
    createdAt: new Date().toISOString(),
    authorId,
    summary,
    files: artifact.files.map((file) => ({ ...file })),
  };
}
