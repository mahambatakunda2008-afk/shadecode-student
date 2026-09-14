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

function objectiveText(objective: ObjectiveLike) {
  return `${objective.title} ${objective.description ?? ""} ${objective.topic ?? ""}`.toLowerCase();
}

function structuralChecks(objective: ObjectiveLike): ObjectiveEvidenceCheck[] {
  const text = objectiveText(objective);
  const checks: ObjectiveEvidenceCheck[] = [];
  const add = (id: string, name: string, pattern: string, message: string) => {
    checks.push({ id: `${objective.id}:${id}`, name, kind: "structure", pattern, message });
  };

  if (/function|procedure|subroutine|method/.test(text)) {
    add("function", "Reusable code", "(?:function\\s+[A-Za-z_$][\\w$]*\\s*\\(|(?:const|let|var)\\s+[A-Za-z_$][\\w$]*\\s*=\\s*(?:async\\s*)?\\()", "Define a reusable function/procedure or equivalent abstraction.");
  }
  if (/selection|conditional|if statement|if\/else|decision/.test(text)) {
    add("selection", "Selection", "\\bif\\s*\\(", "Use a conditional selection structure.");
  }
  if (/loop|iteration|repetition|for loop|while loop/.test(text)) {
    add("iteration", "Iteration", "\\b(?:for|while)\\s*\\(", "Use an iteration structure appropriate to the task.");
  }
  if (/array|list|collection/.test(text)) {
    add("collection", "Collection", "(?:\\[[^\\]]*\\]|new\\s+Array|\\.push\\s*\\()", "Use a collection/array structure to hold multiple values.");
  }
  if (/output|print|display|console/.test(text)) {
    add("output", "Output", "(?:console\\.(?:log|info)|print\\s*\\()", "Produce observable program output.");
  }
  if (/debug|error handling|exception/.test(text)) {
    add("error-handling", "Error handling", "(?:try\\s*\\{|catch\\s*\\(|throw\\s+)", "Include explicit error handling where appropriate.");
  }

  return checks;
}

/**
 * Build deterministic, inspectable evidence checks from curriculum wording.
 * These checks never claim to reproduce an examination board's marking scheme.
 */
export function buildObjectiveEvidenceChecks(objective: ObjectiveLike) {
  const checks = structuralChecks(objective);
  if (checks.length === 0) {
    checks.push({
      id: `${objective.id}:non-empty`,
      name: "Learner code exists",
      kind: "structure",
      pattern: "\\S",
      message: "Add code that demonstrates the selected objective.",
    });
  }
  return checks;
}

export function evaluateObjectiveEvidence(
  checks: ObjectiveEvidenceCheck[],
  files: Array<{ path: string; content: string }>,
): ObjectiveEvidenceResult[] {
  const source = files.map((file) => `// ${file.path}\n${file.content}`).join("\n\n");

  return checks.map((check) => {
    if (check.kind !== "structure" || !check.pattern) {
      return { ...check, status: "passed", detail: "No structural check was required." };
    }

    try {
      const matched = new RegExp(check.pattern, check.flags).test(source);
      return {
        ...check,
        status: matched ? "passed" : "failed",
        detail: matched ? "Evidence found in the project." : check.message,
      };
    } catch (cause) {
      return {
        ...check,
        status: "error",
        detail: `Evidence check could not run: ${cause instanceof Error ? cause.message : String(cause)}`,
      };
    }
  });
}
