import type { Artifact } from "@/lib/platform/artifacts";

export interface ArtifactStore {
  get(id: string): Promise<Artifact | null>;
  list(ownerId: string): Promise<Artifact[]>;
  save(artifact: Artifact): Promise<void>;
  remove(id: string): Promise<void>;
}

const memory = new Map<string, Artifact>();

export const memoryArtifactStore: ArtifactStore = {
  async get(id) {
    return memory.get(id) ?? null;
  },
  async list(ownerId) {
    return [...memory.values()].filter((artifact) => artifact.ownerId === ownerId);
  },
  async save(artifact) {
    memory.set(artifact.id, artifact);
  },
  async remove(id) {
    memory.delete(id);
  },
};
