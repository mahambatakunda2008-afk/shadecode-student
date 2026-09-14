import { sourceTextForChecks } from "./source-checks";

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
  const add = (id: string, name: string, pattern: string, message: string) => checks.push({ id: `${objective.id}:${id}`, name, kind: "structure", pattern, message });

  if (/function|procedure|subroutine|method/.test(text)) add("function", "Reusable code", "(?:\\bfunction\\s+[A-Za-z_$][\\w$]*\\s*\\(|\\b(?:def|func)\\s+[A-Za-z_]\\w*\\s*\\(|\\b(?:public|private|protected|static|shared)?\\s*(?:[A-Za-z_][\\w<>\\[\\]]*\\s+)?[A-Za-z_]\\w*\\s*\\([^;{}]*\\)\\s*\\{|\\b(?:Sub|Function)\\s+[A-Za-z_]\\w*\\s*\\()", "Define a reusable function, procedure, method, or equivalent abstraction.");
  if (/selection|conditional|if statement|if\/else|decision/.test(text)) add("selection", "Selection", "(?:\\bif\\s*\\([^)]*\\)|\\bif\\s+[^\\n]+\\s+then\\b|\\bif\\s+[^:]+:)", "Use a conditional selection structure appropriate to the language.");
  if (/loop|iteration|repetition|for loop|while loop/.test(text)) add("iteration", "Iteration", "(?:\\b(?:for|while)\\s*(?:\\([^)]*\\)|[^\\n{]+)|\\bdo\\s*\\{)", "Use an iteration structure appropriate to the language.");
  if (/array|list|collection/.test(text)) add("collection", "Collection", "(?:\\[[^\\]]*\\]|\\b(?:new\\s+Array|ArrayList|List|vector|std::vector)\\b|\\.push\\s*\\()", "Use a collection or array structure to hold multiple values.");
  if (/output|print|display|console/.test(text)) add("output", "Output", "(?:\\bconsole\\.(?:log|info|warn|error)\\s*\\(|\\bprint(?:ln)?\\s*\\(|\\bSystem\\.out\\.(?:print|println)\\s*\\(|\\bprintf\\s*\\(|\\bConsole\\.(?:Write|WriteLine)\\s*\\()", "Produce observable program output.");
  if (/input|read|user input|keyboard input/.test(text)) add("input", "Input", "(?:\\b(?:prompt|input)\\s*\\(|\\b(?:readLine|readln|scanf|fgets)\\s*\\(|\\b(?:Console\\.)?ReadLine\\s*\\()", "Read or capture input from the user or an appropriate input source.");
  if (/debug|error handling|exception|try\/catch|validation/.test(text)) add("error-handling", "Error handling", "(?:\\btry\\s*(?:\\{|:)|\\bcatch\\s*(?:\\([^)]*\\))?\\s*\\{|\\bexcept\\s*[^:]*:|\\bthrow\\s+|\\bthrows\\s+)", "Include explicit error handling or validation where appropriate.");
  if (/class|object-oriented|oop|encapsulation|inheritance|polymorphism/.test(text)) add("oop", "Object-oriented structure", "(?:\\bclass\\s+[A-Za-z_]\\w*|\\binterface\\s+[A-Za-z_]\\w*|\\bextends\\s+[A-Za-z_]\\w*|\\bimplements\\s+[A-Za-z_]\\w*)", "Demonstrate an object-oriented type or relationship required by the objective.");
  if (/database|sql|query|table|relational/.test(text)) add("database", "Database evidence", "(?:\\b(?:SELECT|INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|CREATE\\s+TABLE|ALTER\\s+TABLE)\\b|\\b(?:sqlite|postgres|mysql|database|connection)\\b)", "Include a database operation or structure relevant to the objective.");

  return checks;
}

/** Build deterministic, inspectable evidence checks from curriculum wording. */
export function buildObjectiveEvidenceChecks(objective: ObjectiveLike) {
  const checks = structuralChecks(objective);
  if (checks.length === 0) checks.push({ id: `${objective.id}:non-empty`, name: "Learner code exists", kind: "structure", pattern: "\\S", message: "Add code that demonstrates the selected objective." });
  return checks;
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
