import type { RuntimeDiagnostic, RuntimeRequest, RuntimeResult } from "./types";
import { runBrowserJavaScript } from "./browser-runtime";
import { runBrowserPython, runBrowserSql, runBrowserTypeScript } from "./browser-polyglot";
import { runPseudocode } from "./pseudocode";
import { unavailableRuntimeResult } from "./providers";
import { buildProjectDiagnostics } from "../project-diagnostics";
import { analyzeShade, buildShadeProjectGraph, createShadeEvidence, createShadeExecutionPlan, createShadeProjectModel, lowerShadeToIR, runShade, SHADE_LANGUAGE_VERSION, parseShade } from "../../shade";

export type { RuntimeDiagnostic, RuntimeEvent, RuntimeLanguage, RuntimeRequest, RuntimeResult } from "./types";
export type { RuntimeProvider, RuntimeProviderId } from "./providers";

function withDiagnosticEvents(result: RuntimeResult): RuntimeResult {
  if (!result.diagnostics.length) return result;
  const existing = new Set(result.events.filter((event) => event.type === "diagnostic").map((event) => JSON.stringify(event.diagnostic)));
  const diagnostics = result.diagnostics.filter((diagnostic) => !existing.has(JSON.stringify(diagnostic)));
  if (!diagnostics.length) return result;
  return { ...result, events: [...result.events, ...diagnostics.map((diagnostic) => ({ type: "diagnostic" as const, diagnostic }))] };
}

function publishDiagnostics(request: RuntimeRequest, result: RuntimeResult) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("shadecode:comp-lab:runtime", { detail: { requestId: result.id, language: result.language, entryFile: request.entryFile, diagnostics: result.diagnostics as RuntimeDiagnostic[] } }));
}

function providerFor(language: RuntimeRequest["language"]) {
  if (language === "shade") return "shade-interpreter" as const;
  if (language === "javascript") return "browser-javascript" as const;
  if (language === "typescript") return "typescript-transpiler" as const;
  if (language === "pseudocode") return "pseudocode-interpreter" as const;
  if (language === "csharp" || language === "vbnet") return "dotnet" as const;
  if (language === "python") return "python" as const;
  if (language === "java" || language === "kotlin") return "jvm" as const;
  if (language === "c") return "native-c" as const;
  if (language === "cpp") return "native-cpp" as const;
  if (language === "sql") return "sql" as const;
  return "generic-native" as const;
}

function addProjectDiagnostics(request: RuntimeRequest, result: RuntimeResult): RuntimeResult {
  if (!request.files?.length) return result;
  const graphDiagnostics = buildProjectDiagnostics(request.files);
  if (!graphDiagnostics.length) return result;
  const existing = new Set(result.diagnostics.map((diagnostic) => JSON.stringify(diagnostic)));
  return { ...result, diagnostics: [...result.diagnostics, ...graphDiagnostics.filter((diagnostic) => !existing.has(JSON.stringify(diagnostic)))] };
}

export async function executeCode(request: RuntimeRequest): Promise<RuntimeResult> {
  let base: RuntimeResult;
  if (request.language === "shade") {
    const started = performance.now();
    const parsedSource = parseShade(request.code);
    const parsed = runShade(request.code, { inputs: request.inputs, maxSteps: Math.max(1000, Math.floor((request.timeoutMs ?? 5000) * 100)) });
    const semantic = analyzeShade(parsedSource.program);
    const executionPlan = createShadeExecutionPlan(semantic, request.entryFile ?? "main.shade");
    const project = createShadeProjectModel({ name: "Comp Lab Shade project", entry: request.entryFile ?? "main.shade", semantic, languageVersion: SHADE_LANGUAGE_VERSION });
    const graph = buildShadeProjectGraph(project);
    const ir = lowerShadeToIR(parsedSource.program);
    const diagnostics: RuntimeDiagnostic[] = [...parsed.diagnostics, ...semantic.diagnostics.map((diagnostic) => ({ ...diagnostic, source: "language" as const }))].map((diagnostic) => ({ ...diagnostic, source: "language" as const, file: request.entryFile }));
    const exitCode = diagnostics.some((d) => d.severity === "error") ? 1 : 0;
    const durationMs = Math.max(parsed.durationMs, performance.now() - started);
    const evidence = createShadeEvidence({ semantic, exitCode, durationMs, stdoutLines: parsed.stdout.length });
    base = {
      id: request.id,
      language: request.language,
      events: [
        { type: "status", status: "starting" },
        { type: "status", status: diagnostics.some((d) => d.severity === "error") ? "failed" : "running" },
        ...parsed.stdout.map((text) => ({ type: "stdout" as const, text })),
        ...diagnostics.map((diagnostic) => ({ type: "diagnostic" as const, diagnostic })),
        { type: "status", status: exitCode === 0 ? "completed" : "failed" },
        { type: "exit", code: exitCode },
      ],
      diagnostics,
      exitCode,
      durationMs,
      metadata: { semantic, project, graph, executionPlan, ir, evidence },
    };
  } else if (request.language === "javascript") base = await runBrowserJavaScript(request);
  else if (request.language === "typescript") base = await runBrowserTypeScript(request);
  else if (request.language === "python") base = await runBrowserPython(request);
  else if (request.language === "sql") base = await runBrowserSql(request);
  else if (request.language === "pseudocode") base = await runPseudocode(request);
  else base = unavailableRuntimeResult(request, providerFor(request.language));
  const result = withDiagnosticEvents(addProjectDiagnostics(request, base));
  publishDiagnostics(request, result);
  return result;
}
