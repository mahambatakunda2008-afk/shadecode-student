import type { ShadeSemanticModel } from "./semantic";
import type { ShadeArtifact, ShadeProjectModel } from "./project";

export type ShadeGraphNodeKind = "project" | "artifact" | "symbol" | "capability" | "concept";

export type ShadeGraphNode = {
  id: string;
  kind: ShadeGraphNodeKind;
  label: string;
};

export type ShadeGraphEdge = {
  from: string;
  to: string;
  relation: "contains" | "defines" | "requires" | "uses" | "implements";
};

export type ShadeProjectGraph = {
  version: "0.1";
  nodes: ShadeGraphNode[];
  edges: ShadeGraphEdge[];
};

export function buildShadeProjectGraph(project: ShadeProjectModel): ShadeProjectGraph {
  const nodes: ShadeGraphNode[] = [
    { id: "project", kind: "project", label: project.manifest.name },
  ];
  const edges: ShadeGraphEdge[] = [];

  for (const artifact of project.manifest.artifacts) {
    addArtifact(nodes, edges, artifact);
  }

  addSemanticNodes(nodes, edges, project.semantic);
  return { version: "0.1", nodes, edges };
}

function addArtifact(nodes: ShadeGraphNode[], edges: ShadeGraphEdge[], artifact: ShadeArtifact) {
  const id = `artifact:${artifact.id}`;
  nodes.push({ id, kind: "artifact", label: artifact.path });
  edges.push({ from: "project", to: id, relation: "contains" });
}

function addSemanticNodes(nodes: ShadeGraphNode[], edges: ShadeGraphEdge[], semantic: ShadeSemanticModel) {
  for (const symbol of semantic.symbols) {
    const id = `symbol:${symbol.kind}:${symbol.name}`;
    nodes.push({ id, kind: "symbol", label: symbol.name });
    edges.push({ from: "artifact:entry", to: id, relation: "defines" });
  }
  for (const capability of semantic.capabilities) {
    const id = `capability:${capability}`;
    nodes.push({ id, kind: "capability", label: capability });
    edges.push({ from: "artifact:entry", to: id, relation: "requires" });
  }
  for (const concept of semantic.concepts) {
    const id = `concept:${concept}`;
    nodes.push({ id, kind: "concept", label: concept });
    edges.push({ from: "artifact:entry", to: id, relation: "implements" });
  }
}
