import type { RuntimeRequest, RuntimeResult } from "./types";
import { runBrowserJavaScript } from "./browser-runtime";

export type { RuntimeDiagnostic, RuntimeEvent, RuntimeLanguage, RuntimeRequest, RuntimeResult } from "./types";

export async function executeCode(request: RuntimeRequest): Promise<RuntimeResult> {
  if (request.language === "javascript") {
    return runBrowserJavaScript(request);
  }

  throw new Error(
    request.language === "typescript"
      ? "TypeScript execution requires the Code Lab transpilation service and is not enabled in the browser runtime yet."
      : `No ${request.language} runtime is installed yet.`,
  );
}
