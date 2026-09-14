import type { RuntimeDiagnostic } from "./runtime/types";
import { buildProjectGraph, type ProjectGraphLanguage, type ProjectGraphNode } from "./project-graph";

type DiagnosticFile = { path: string; content: string };

function diagnostic(message: string, file?: string): RuntimeDiagnostic {
  return {
    message,
    severity: "error",
    ...(file ? { file } : {}),
  };
}

export function buildProjectDiagnostics(
  files: DiagnosticFile[],
  language: ProjectGraphLanguage = "javascript",
): RuntimeDiagnostic[] {
  const graph = buildProjectGraph(files, language);
  const diagnostics: RuntimeDiagnostic[] = [];

  for (const node of graph.nodes as ProjectGraphNode[]) {
    for (const dependency of node.unresolvedDependencies) {
      diagnostics.push(
        diagnostic(`Cannot resolve relative import '${dependency}'.`, node.path),
      );
    }
  }

  for (const cycle of graph.cycles) {
    diagnostics.push(
      diagnostic(`Circular dependency detected: ${cycle.join(" → ")}.`, cycle[0]),
    );
  }

  return diagnostics;
}
