import type { RuntimeRequest, RuntimeResult } from "./types";
import { runBrowserJavaScript } from "./browser-runtime";

export type { RuntimeEvent, RuntimeLanguage, RuntimeRequest, RuntimeResult } from "./types";

export async function executeCode(request: RuntimeRequest): Promise<RuntimeResult> {
  if (request.language === "javascript" || request.language === "typescript") {
    return runBrowserJavaScript(request);
  }

  throw new Error(`No ${request.language} runtime is installed yet.`);
}
