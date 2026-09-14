import type { RuntimeRequest, RuntimeResult } from "./types";

/** Runtime targets are explicit providers, never language-name tricks. */
export type RuntimeProviderId = "browser-javascript" | "typescript-transpiler" | "pseudocode-interpreter" | "dotnet" | "python" | "jvm" | "native-c" | "native-cpp" | "sql" | "generic-native";

export type RuntimeProvider = {
  id: RuntimeProviderId;
  languages: string[];
  execute: (request: RuntimeRequest) => Promise<RuntimeResult>;
};

export function unavailableRuntimeResult(request: RuntimeRequest, provider: RuntimeProviderId): RuntimeResult {
  const message = provider === "typescript-transpiler"
    ? "The TypeScript compiler runtime is unavailable."
    : provider === "pseudocode-interpreter"
      ? "The pseudocode interpreter is unavailable."
      : provider === "dotnet"
        ? "The .NET runtime is not connected yet. Comp Lab reserves real C# and VB.NET execution and will not execute .NET code as browser JavaScript."
        : provider === "python"
          ? "The Python runtime is not connected yet."
          : provider === "jvm"
            ? "The JVM runtime is not connected yet."
            : provider === "native-c"
              ? "The native C toolchain is not connected yet."
              : provider === "native-cpp"
                ? "The native C++ toolchain is not connected yet."
                : provider === "sql"
                  ? "The SQL engine is not connected yet."
                  : "No runtime provider is available for this language yet.";
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
