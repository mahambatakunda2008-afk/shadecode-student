import type { RuntimeRequest, RuntimeResult } from "./types";

/** Runtime targets are explicit providers, not language-name switches. */
export type RuntimeProviderId = "browser-javascript" | "dotnet" | "python" | "sql";

export type RuntimeProvider = {
  id: RuntimeProviderId;
  languages: string[];
  execute: (request: RuntimeRequest) => Promise<RuntimeResult>;
};

export function unavailableRuntimeResult(request: RuntimeRequest, provider: RuntimeProviderId): RuntimeResult {
  const message = provider === "dotnet"
    ? "The .NET runtime is not connected yet. Comp Lab has reserved a real C# / VB.NET execution target, but it will not pretend to execute .NET code in the browser."
    : provider === "python"
      ? "The Python runtime is not connected yet."
      : provider === "sql"
        ? "The SQL runtime is not connected yet."
        : "No runtime provider is available for this language.";
  const diagnostic = { severity: "info" as const, message, source: "runtime" as const };
  return {
    id: request.id,
    language: request.language,
    events: [
      { type: "status", status: "starting" },
      { type: "diagnostic", diagnostic },
      { type: "error", message, diagnostic },
      { type: "status", status: "failed" },
      { type: "exit", code: 127 },
    ],
    diagnostics: [diagnostic],
    exitCode: 127,
    durationMs: 0,
  };
}
