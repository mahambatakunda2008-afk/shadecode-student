import type { ShadeSemanticModel } from "./semantic";

export type ShadeExecutionPlan = {
  version: "0.1";
  language: "shade";
  entryFile: string;
  provider: "shade-interpreter";
  capabilities: string[];
  networkRequired: boolean;
  privacy: "local" | "device" | "network";
  isolation: "interpreter";
  deterministic: boolean;
};

export type ShadeEvidence = {
  execution: "executed" | "failed";
  exitCode: number;
  durationMs: number;
  stdoutLines: number;
  diagnostics: number;
  concepts: string[];
  capabilities: string[];
};

export function createShadeExecutionPlan(semantic: ShadeSemanticModel, entryFile = "main.shade"): ShadeExecutionPlan {
  const networkRequired = semantic.capabilities.includes("network.internet");
  return {
    version: "0.1",
    language: "shade",
    entryFile,
    provider: "shade-interpreter",
    capabilities: semantic.capabilities,
    networkRequired,
    privacy: networkRequired ? "network" : semantic.capabilities.some((capability) => capability.startsWith("device.")) ? "device" : "local",
    isolation: "interpreter",
    deterministic: !networkRequired,
  };
}

export function createShadeEvidence(input: {
  semantic: ShadeSemanticModel;
  exitCode: number;
  durationMs: number;
  stdoutLines: number;
}): ShadeEvidence {
  return {
    execution: input.exitCode === 0 ? "executed" : "failed",
    exitCode: input.exitCode,
    durationMs: input.durationMs,
    stdoutLines: input.stdoutLines,
    diagnostics: input.semantic.diagnostics.length,
    concepts: input.semantic.concepts,
    capabilities: input.semantic.capabilities,
  };
}
