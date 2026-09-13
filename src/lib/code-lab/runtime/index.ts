import type { RuntimeDiagnostic, RuntimeRequest, RuntimeResult } from "./types";
import { runBrowserJavaScript } from "./browser-runtime";
import { unavailableRuntimeResult } from "./providers";

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
  window.dispatchEvent(new CustomEvent("shadecode:comp-lab:runtime", {
    detail: {
      requestId: result.id,
      language: result.language,
      entryFile: request.entryFile,
      diagnostics: result.diagnostics as RuntimeDiagnostic[],
    },
  }));
}

function providerFor(language: RuntimeRequest["language"]) {
  if (language === "javascript") return "browser-javascript" as const;
  if (language === "typescript") return "typescript-transpiler" as const;
  if (language === "csharp" || language === "vbnet") return "dotnet" as const;
  if (language === "python") return "python" as const;
  if (language === "java" || language === "kotlin") return "jvm" as const;
  if (language === "c") return "native-c" as const;
  if (language === "cpp") return "native-cpp" as const;
  if (language === "sql") return "sql" as const;
  return "generic-native" as const;
}

export async function executeCode(request: RuntimeRequest): Promise<RuntimeResult> {
  const result = request.language === "javascript"
    ? withDiagnosticEvents(await runBrowserJavaScript(request))
    : unavailableRuntimeResult(request, providerFor(request.language));
  publishDiagnostics(request, result);
  return result;
}
