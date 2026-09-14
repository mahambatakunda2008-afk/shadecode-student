import type { RuntimeDiagnostic } from "./runtime/types";
import { buildProjectGraph, type ProjectGraphLanguage } from "./project-graph";

type DiagnosticFile = { path: string; content: string };

function diagnostic(message: string, file?: string): RuntimeDiagnostic {
  return {
    message,
    severity: "error",
    source: "language",
    ...(file ? { file } : {}),
  };
}

/** Convert lightweight project-graph health findings into editor diagnostics. */
export function buildProjectDiagnostics(
  files: DiagnosticFile[],
  language: ProjectGraphLanguage = "javascript",
): RuntimeDiagnostic[] {
  const graph = buildProjectGraph(files, language);
  const diagnostics: RuntimeDiagnostic[] = [];

  for (const node of graph.nodes) {
    for (const dependency of node.unresolvedImports) {
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
