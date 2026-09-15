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

export function createShadeProjectModel(input: {
  name: string;
  entry: string;
  semantic: ShadeSemanticModel;
  artifacts?: ShadeArtifact[];
  languageVersion: string;
}): ShadeProjectModel {
  const artifacts = input.artifacts ?? [{ id: "entry", path: input.entry, type: "source", language: "shade" }];
  const graph = [
    { from: "project", to: "entry", relation: "contains" as const },
    ...input.semantic.dependencies.map((dependency) => ({ from: "entry", to: dependency, relation: "requires" as const })),
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
