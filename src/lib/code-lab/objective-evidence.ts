import { sourceTextForChecks } from "./source-checks";
import { buildObjectiveTestPlan } from "./objective-test-plan";

export type ObjectiveEvidenceKind = "structure" | "runtime";

export type ObjectiveEvidenceCheck = {
  id: string;
  name: string;
  kind: ObjectiveEvidenceKind;
  pattern?: string;
  flags?: string;
  message: string;
};

export type ObjectiveEvidenceResult = ObjectiveEvidenceCheck & {
  status: "passed" | "failed" | "error";
  detail: string;
};

type ObjectiveLike = {
  id: string;
  title: string;
  description?: string | null;
  topic?: string | null;
};

/**
 * Build deterministic, inspectable evidence checks from the same objective
 * plan used by Comp Lab's learning-test layer.
 */
export function buildObjectiveEvidenceChecks(objective: ObjectiveLike): ObjectiveEvidenceCheck[] {
  return buildObjectiveTestPlan(objective).map((item) => ({
    id: item.id,
    name: item.name,
    kind: "structure",
    pattern: item.check.pattern,
    flags: item.check.flags,
    message: item.check.message,
  }));
}

export function evaluateObjectiveEvidence(checks: ObjectiveEvidenceCheck[], files: Array<{ path: string; content: string }>): ObjectiveEvidenceResult[] {
  const source = sourceTextForChecks(files);
  return checks.map((check) => {
    if (check.kind !== "structure" || !check.pattern) return { ...check, status: "passed", detail: "No structural check was required." };
    try {
      const matched = new RegExp(check.pattern, check.flags).test(source);
      return { ...check, status: matched ? "passed" : "failed", detail: matched ? "Evidence found in source files." : check.message };
    } catch (cause) {
      return { ...check, status: "error", detail: `Evidence check could not run: ${cause instanceof Error ? cause.message : String(cause)}` };
    }
  });
}
