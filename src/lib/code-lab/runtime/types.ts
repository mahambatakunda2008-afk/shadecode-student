export type RuntimeLanguage =
  | "shade" | "javascript" | "typescript" | "python" | "csharp" | "vbnet" | "sql"
  | "java" | "c" | "cpp" | "kotlin" | "php" | "rust" | "go" | "pseudocode";

export type RuntimeDiagnostic = {
  severity: "error" | "warning" | "info";
  message: string;
  file?: string;
  line?: number;
  column?: number;
  source: "runtime" | "compiler" | "language";
};

export type RuntimeRequest = {
  id: string;
  language: RuntimeLanguage;
  code: string;
  files?: Array<{ path: string; content: string }>;
  entryFile?: string;
  timeoutMs?: number;
  inputs?: string[];
};

export type RuntimeEvent =
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "diagnostic"; diagnostic: RuntimeDiagnostic }
  | { type: "status"; status: "starting" | "running" | "completed" | "failed" | "timed_out" }
  | { type: "exit"; code: number }
  | { type: "error"; message: string; diagnostic?: RuntimeDiagnostic };

export type RuntimeResult = {
  id: string;
  language: RuntimeLanguage;
  events: RuntimeEvent[];
  diagnostics: RuntimeDiagnostic[];
  exitCode: number | null;
  durationMs: number;
};
