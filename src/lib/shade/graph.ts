import type { ShadeSemanticModel } from "./semantic";
import type { ShadeArtifact, ShadeProjectModel } from "./project";

export type ShadeGraphNodeKind = "project" | "artifact" | "symbol" | "capability" | "concept";
export type ShadeGraphNode = { id: string; kind: ShadeGraphNodeKind; label: string };
export type ShadeGraphEdge = { from: string; to: string; relation: "contains" | "defines" | "requires" | "uses" | "implements" };
export type ShadeProjectGraph = { version: "0.1"; nodes: ShadeGraphNode[]; edges: ShadeGraphEdge[] };

export function buildShadeProjectGraph(project: ShadeProjectModel): ShadeProjectGraph {
  const nodes: ShadeGraphNode[] = [{ id: "project", kind: "project", label: project.manifest.name }];
  const edges: ShadeGraphEdge[] = [];
  const artifactIds = new Set<string>();

  for (const artifact of project.manifest.artifacts) {
    addArtifact(nodes, edges, artifact);
    artifactIds.add(artifact.id);
  }

  const entryArtifact = project.manifest.artifacts.find((artifact) => artifact.path === project.manifest.entry);
  const sourceId = entryArtifact ? `artifact:${entryArtifact.id}` : "project";
  addSemanticNodes(nodes, edges, project.semantic, sourceId, artifactIds);
  return { version: "0.1", nodes, edges };
}

function addArtifact(nodes: ShadeGraphNode[], edges: ShadeGraphEdge[], artifact: ShadeArtifact) {
  const id = `artifact:${artifact.id}`;
  nodes.push({ id, kind: "artifact", label: artifact.path });
  edges.push({ from: "project", to: id, relation: "contains" });
}

function addSemanticNodes(
  nodes: ShadeGraphNode[],
  edges: ShadeGraphEdge[],
  semantic: ShadeSemanticModel,
  sourceId: string,
  artifactIds: Set<string>,
) {
  for (const symbol of semantic.symbols) {
    const id = `symbol:${symbol.kind}:${symbol.name}`;
    nodes.push({ id, kind: "symbol", label: symbol.name });
    edges.push({ from: sourceId, to: id, relation: "defines" });
  }
  for (const capability of semantic.capabilities) {
    const id = `capability:${capability}`;
    nodes.push({ id, kind: "capability", label: capability });
    edges.push({ from: sourceId, to: id, relation: "requires" });
  }
  for (const concept of semantic.concepts) {
    const id = `concept:${concept}`;
    nodes.push({ id, kind: "concept", label: concept });
    edges.push({ from: sourceId, to: id, relation: "implements" });
  }
  for (const dependency of semantic.dependencies) {
    const target = dependency.startsWith("artifact:") ? dependency : `artifact:${dependency}`;
    if (artifactIds.has(target.slice("artifact:".length))) {
      edges.push({ from: sourceId, to: target, relation: "uses" });
    }
  }
}
