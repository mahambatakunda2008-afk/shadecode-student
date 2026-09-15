export type RuntimeLanguage = string;

export type RuntimeDiagnosticSeverity = "error" | "warning" | "info";

export interface RuntimeDiagnostic {
  severity: RuntimeDiagnosticSeverity;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  source?: string;
}

export interface RuntimeRequest {
  id: string;
  language: RuntimeLanguage;
  code: string;
  entryFile?: string;
  inputs?: string[];
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export type RuntimeEvent =
  | { type: "status"; status: string }
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "diagnostic"; diagnostic: RuntimeDiagnostic }
  | { type: "exit"; code: number };

export interface RuntimeResult {
  id: string;
  language: RuntimeLanguage;
  events: RuntimeEvent[];
  diagnostics: RuntimeDiagnostic[];
  exitCode: number;
  durationMs: number;
  metadata?: Record<string, unknown>;
}
