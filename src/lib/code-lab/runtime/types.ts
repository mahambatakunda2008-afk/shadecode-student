export type RuntimeLanguage = "javascript" | "typescript" | "python";

export type RuntimeDiagnostic = {
  message: string;
  line?: number;
  column?: number;
  severity?: "error" | "warning" | "info";
};

export type RuntimeRequest = {
  id: string;
  language: RuntimeLanguage;
  code: string;
  files?: Array<{ path: string; content: string }>;
  timeoutMs?: number;
};

export type RuntimeEvent =
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "diagnostic"; diagnostic: RuntimeDiagnostic }
  | { type: "status"; status: "starting" | "running" | "completed" | "failed" | "timed_out" }
  | { type: "exit"; code: number }
  | { type: "error"; message: string };

export type RuntimeResult = {
  id: string;
  language: RuntimeLanguage;
  events: RuntimeEvent[];
  exitCode: number | null;
  durationMs: number;
};
