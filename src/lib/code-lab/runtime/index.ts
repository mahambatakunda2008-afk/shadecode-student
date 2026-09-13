import type { RuntimeRequest, RuntimeResult } from "./types";
import { runBrowserJavaScript } from "./browser-runtime";

export type { RuntimeDiagnostic, RuntimeEvent, RuntimeLanguage, RuntimeRequest, RuntimeResult } from "./types";

function withDiagnosticEvents(result: RuntimeResult): RuntimeResult {
  if (!result.diagnostics.length) return result;
  const existing = new Set(
    result.events
      .filter((event) => event.type === "diagnostic")
      .map((event) => JSON.stringify(event.diagnostic)),
  );
  const diagnostics = result.diagnostics.filter((diagnostic) => !existing.has(JSON.stringify(diagnostic)));
  if (!diagnostics.length) return result;
  return {
    ...result,
    events: [
      ...result.events,
      ...diagnostics.map((diagnostic) => ({ type: "diagnostic" as const, diagnostic })),
    ],
  };
}

export async function executeCode(request: RuntimeRequest): Promise<RuntimeResult> {
  if (request.language === "javascript") {
    return withDiagnosticEvents(await runBrowserJavaScript(request));
  }

  throw new Error(
    request.language === "typescript"
      ? "TypeScript execution requires the Code Lab transpilation service and is not enabled in the browser runtime yet."
      : `No ${request.language} runtime is installed yet.`,
  );
}
