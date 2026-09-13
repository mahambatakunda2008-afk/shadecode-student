import type { RuntimeRequest, RuntimeResult } from "./types";
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

function unavailableProvider(request: RuntimeRequest) {
  if (request.language === "csharp" || request.language === "vbnet") return "dotnet" as const;
  if (request.language === "python") return "python" as const;
  if (request.language === "sql") return "sql" as const;
  return "browser-javascript" as const;
}

export async function executeCode(request: RuntimeRequest): Promise<RuntimeResult> {
  if (request.language === "javascript") return withDiagnosticEvents(await runBrowserJavaScript(request));
  return unavailableRuntimeResult(request, unavailableProvider(request));
}
