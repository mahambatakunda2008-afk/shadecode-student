import type { SourceEvidenceCheck } from "./source-checks";

type ObjectiveLike = {
  id: string;
  objective_key: string;
  title: string;
  description?: string | null;
  topic?: string | null;
};

export type ObjectiveSourceCheck = { id: string; name: string; check: SourceEvidenceCheck };

function textFor(objective: ObjectiveLike) {
  return `${objective.title} ${objective.description ?? ""} ${objective.topic ?? ""}`.toLowerCase();
}

const source = (pattern: string, message: string): SourceEvidenceCheck => ({ pattern, message });

/**
 * Generates inspectable source-evidence checks from curriculum wording,
 * evaluated via evaluateSourceEvidence() in source-checks.ts. This is a
 * learning evidence layer, not a substitute for official examination
 * marking schemes.
 */
export function buildObjectiveTestPlan(objective: ObjectiveLike): ObjectiveSourceCheck[] {
  const text = textFor(objective);
  const tests: ObjectiveSourceCheck[] = [];
  const add = (id: string, name: string, pattern: string, message: string) => {
    tests.push({ id: `${objective.id}:${id}`, name, check: source(pattern, message) });
  };

  if (/function|procedure|subroutine|method/.test(text)) {
    add("function", "Reusable code", "(?:\\bfunction\\s+[A-Za-z_$][\\w$]*\\s*\\(|\\b(?:def|func)\\s+[A-Za-z_]\\w*\\s*\\(|\\b(?:Sub|Function)\\s+[A-Za-z_]\\w*\\s*\\(|\\b(?:public|private|protected|static|shared)?\\s*(?:[A-Za-z_][\\w<>\\[\\]]*\\s+)?[A-Za-z_]\\w*\\s*\\([^;{}]*\\)\\s*\\{)", "Define a reusable function, procedure, method, or equivalent abstraction.");
  }
  if (/selection|conditional|if statement|if\/else|decision/.test(text)) {
    add("selection", "Selection", "(?:\\bif\\s*\\([^)]*\\)|\\bif\\s+[^\\n]+\\s+then\\b|\\bif\\s+[^:]+:)", "Use a conditional selection structure appropriate to the language.");
  }
  if (/loop|iteration|repetition|for loop|while loop/.test(text)) {
    add("iteration", "Iteration", "(?:\\b(?:for|while)\\s*(?:\\([^)]*\\)|[^\\n{]+)|\\bdo\\s*\\{)", "Use an iteration structure appropriate to the language.");
  }
  if (/array|list|collection/.test(text)) {
    add("collection", "Collection", "(?:\\[[^\\]]*\\]|\\b(?:new\\s+Array|ArrayList|List|vector|std::vector)\\b|\\.push\\s*\\()", "Use an array, list, or collection to hold multiple values.");
  }
  if (/output|print|display|console/.test(text)) {
    add("output", "Output", "(?:\\bconsole\\.(?:log|info|warn|error)\\s*\\(|\\bprint(?:ln)?\\s*\\(|\\bSystem\\.out\\.(?:print|println)\\s*\\(|\\bprintf\\s*\\(|\\bConsole\\.(?:Write|WriteLine)\\s*\\()", "Produce observable output using the language's appropriate output mechanism.");
  }
  if (/input|read|user input|keyboard input/.test(text)) {
    add("input", "Input", "(?:\\b(?:prompt|input)\\s*\\(|\\b(?:readLine|readln|scanf|fgets)\\s*\\(|\\b(?:Console\\.)?ReadLine\\s*\\()", "Read or capture input from the user or an appropriate input source.");
  }
  if (/class|object-oriented|oop|encapsulation|inheritance|polymorphism/.test(text)) {
    add("oop", "Object-oriented structure", "(?:\\bclass\\s+[A-Za-z_]\\w*|\\binterface\\s+[A-Za-z_]\\w*|\\bextends\\s+[A-Za-z_]\\w*|\\bimplements\\s+[A-Za-z_]\\w*)", "Demonstrate the object-oriented type or relationship required by the objective.");
  }
  if (/database|sql|query|table|relational/.test(text)) {
    add("database", "Database operation", "(?:\\b(?:SELECT|INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|CREATE\\s+TABLE|ALTER\\s+TABLE)\\b)", "Include a database operation or structure relevant to the objective.");
  }

  if (/debug|error handling|exception|try\/catch|validation/.test(text)) {
    add("error-handling", "Error handling", "(?:\\btry\\s*(?:\\{|:)|\\bcatch\\s*(?:\\([^)]*\\))?\\s*\\{|\\bexcept\\s*[^:]*:|\\bthrow\\s+|\\bthrows\\s+)", "Include explicit error handling or validation where appropriate.");
  }

  if (!tests.length) {
    add("non-empty", "Learner evidence", "\\S", "Add source code that demonstrates the selected objective.");
  }

  return tests;
}
