import type { ShadeSemanticModel } from "./semantic";

export type ShadeArtifactType = "source" | "data" | "test" | "asset" | "document" | "deployment";

export type ShadeArtifact = {
  id: string;
  path: string;
  type: ShadeArtifactType;
  language?: string;
  contentHash?: string;
};

export type ShadeProjectManifest = {
  format: "shade-project";
  version: "0.1";
  name: string;
  entry: string;
  runtime: { language: "shade"; version: string };
  artifacts: ShadeArtifact[];
  requirements: { capabilities: string[] };
};

export type ShadeProjectModel = {
  manifest: ShadeProjectManifest;
  semantic: ShadeSemanticModel;
  graph: { from: string; to: string; relation: "imports" | "requires" | "tests" | "contains" }[];
};

/** Stable artifact identity derived from a project-relative path. */
export function createShadeArtifactId(path: string): string {
  const normalized = path.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `artifact-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createShadeArtifact(input: Omit<ShadeArtifact, "id"> & { id?: string }): ShadeArtifact {
  return { ...input, id: input.id ?? createShadeArtifactId(input.path) };
}

export function createShadeProjectModel(input: {
  name: string;
  entry: string;
  semantic: ShadeSemanticModel;
  artifacts?: ShadeArtifact[];
  languageVersion: string;
}): ShadeProjectModel {
  const entryArtifact = createShadeArtifact({ path: input.entry, type: "source", language: "shade" });
  const artifacts = input.artifacts?.map((artifact) => createShadeArtifact(artifact)) ?? [entryArtifact];
  const entryId = artifacts.find((artifact) => artifact.path === input.entry)?.id ?? entryArtifact.id;
  const graph = [
    { from: "project", to: entryId, relation: "contains" as const },
    ...input.semantic.dependencies.map((dependency) => ({ from: entryId, to: dependency, relation: "requires" as const })),
  ];
  return {
    manifest: {
      format: "shade-project",
      version: "0.1",
      name: input.name,
      entry: input.entry,
      runtime: { language: "shade", version: input.languageVersion },
      artifacts,
      requirements: { capabilities: input.semantic.capabilities },
    },
    semantic: input.semantic,
    graph,
  };
}
