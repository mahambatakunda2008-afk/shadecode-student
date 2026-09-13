export type RuntimeLanguage = "javascript" | "typescript" | "python";

export type RuntimeRequest = {
  id: string;
  language: RuntimeLanguage;
  code: string;
  files?: Array<{ path: string; content: string }>;
  timeoutMs?: number;
};

export type RuntimeDiagnostic = {
  severity: "error" | "warning" | "info";
  message: string;
  file?: string;
  line?: number;
  column?: number;
  source: "runtime" | "compiler" | "language";
};

export type RuntimeEvent =
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
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
