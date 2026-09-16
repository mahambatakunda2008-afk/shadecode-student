import type { ShadeSemanticModel } from "./semantic";
import { summarizeShadeCapabilities } from "./capabilities";

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
  capabilityPolicy: {
    requested: number;
    allowed: number;
    blocked: number;
  };
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
  const policy = summarizeShadeCapabilities(semantic.capabilities);
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
    capabilityPolicy: { requested: policy.requested, allowed: policy.allowed, blocked: policy.blocked },
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
