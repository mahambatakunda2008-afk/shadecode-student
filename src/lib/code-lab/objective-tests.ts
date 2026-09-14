import type { TestCase } from "./testing";

type ObjectiveLike = {
  id: string;
  objective_key: string;
  title: string;
  description?: string | null;
  topic?: string | null;
};

function textFor(objective: ObjectiveLike) {
  return `${objective.title} ${objective.description ?? ""} ${objective.topic ?? ""}`.toLowerCase();
}

/**
 * Builds small executable learning checks from a curriculum objective.
 *
 * These are deliberately evidence checks, not exam-board marks. They are
 * useful as a deterministic baseline while richer board-specific test
 * generators are added to curriculum data.
 */
export function buildObjectiveTests(objective: ObjectiveLike): TestCase[] {
  const text = textFor(objective);
  const tests: TestCase[] = [];

  if (/output|print|display|console/.test(text)) {
    tests.push({
      id: `${objective.id}:output`,
      name: "Produces output",
      code: `import "{{ENTRY_FILE}}";`,
      timeoutMs: 5000,
    });
  }

  if (/function|procedure|subroutine|method/.test(text)) {
    tests.push({
      id: `${objective.id}:function`,
      name: "Defines reusable code",
      code: `import "{{ENTRY_FILE}}";`,
      timeoutMs: 5000,
    });
  }

  if (/selection|conditional|if statement|if\/else|decision/.test(text)) {
    tests.push({
      id: `${objective.id}:selection`,
      name: "Uses selection",
      code: `import "{{ENTRY_FILE}}";`,
      timeoutMs: 5000,
    });
  }

  if (/loop|iteration|repetition|for loop|while loop/.test(text)) {
    tests.push({
      id: `${objective.id}:iteration`,
      name: "Uses iteration",
      code: `import "{{ENTRY_FILE}}";`,
      timeoutMs: 5000,
    });
  }

  if (/array|list|collection/.test(text)) {
    tests.push({
      id: `${objective.id}:collection`,
      name: "Uses a collection",
      code: `import "{{ENTRY_FILE}}";`,
      timeoutMs: 5000,
    });
  }

  if (/debug|error|test|testing/.test(text)) {
    tests.push({
      id: `${objective.id}:runtime`,
      name: "Runs without a runtime error",
      code: `import "{{ENTRY_FILE}}";`,
      timeoutMs: 5000,
    });
  }

  if (tests.length === 0) {
    tests.push({
      id: `${objective.id}:runtime`,
      name: "Runs the learner project",
      code: `import "{{ENTRY_FILE}}";`,
      timeoutMs: 5000,
    });
  }

  return tests;
}
