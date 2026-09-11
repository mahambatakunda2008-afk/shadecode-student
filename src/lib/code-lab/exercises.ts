export type CodeLabCurriculumIdentity = {
  boardId: string;
  qualificationId: string;
  level: string;
  syllabusId: string;
  syllabusVersion: string;
  subjectId: string;
  paperOrComponentId?: string | null;
};

export type CodeLabObjective = {
  id: string;
  objective_key: string;
  parent_key: string | null;
  topic: string | null;
  title: string;
  description: string | null;
  education_level: string | null;
  paper_component: string | null;
  status: "draft" | "verified" | "archived";
};

export type CodeLabTestCase = {
  id: string;
  label: string;
  kind: "structure" | "output" | "behaviour";
  check: (code: string, output: string[]) => boolean;
  passMessage: string;
  failMessage: string;
};

export type CodeLabExercise = {
  exerciseId: string;
  objectiveId: string;
  objectiveKey: string;
  curriculum: CodeLabCurriculumIdentity | null;
  title: string;
  prompt: string;
  starterCode: string;
  expectedBehaviour: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  hints: string[];
  skill: string;
  testCases: CodeLabTestCase[];
  nextObjectiveId?: string;
};

export type ExerciseResult = {
  passed: boolean;
  passedCount: number;
  totalCount: number;
  feedback: string[];
};

const DEFAULT_STARTER = `// Code Lab\n// Build the solution for the objective.\n\nfunction main() {\n  // Your solution here\n}\n\nmain();\n`;

const tests = {
  sequence: (code: string, output: string[]): CodeLabTestCase[] => [{ id: "sequence-output", label: "Produces observable output", kind: "output", check: (c, o) => /console\\.log/.test(c) && o.length > 0 && !o.some((line) => line.startsWith("Runtime error:")), passMessage: "The program produces observable output.", failMessage: "Run a working program that produces output." }],
  variables: (): CodeLabTestCase[] => [{ id: "variable", label: "Uses a variable", kind: "structure", check: (c) => /\\b(const|let|var)\\s+[A-Za-z_$][\\w$]*/.test(c), passMessage: "A variable is declared.", failMessage: "Declare and use a variable in the solution." }],
  selection: (): CodeLabTestCase[] => [{ id: "selection", label: "Uses selection", kind: "structure", check: (c) => /\\bif\\s*\\(/.test(c), passMessage: "A conditional structure is present.", failMessage: "Use an if/else decision in the solution." }],
  iteration: (): CodeLabTestCase[] => [{ id: "iteration", label: "Uses iteration", kind: "structure", check: (c) => /\\b(for|while)\\s*\\(/.test(c), passMessage: "A loop is present.", failMessage: "Use a loop to repeat the required process." }],
  functions: (): CodeLabTestCase[] => [{ id: "function", label: "Uses a named function", kind: "structure", check: (c) => /function\\s+[A-Za-z_$][\\w$]*\\s*\\(/.test(c), passMessage: "A named function is present.", failMessage: "Create a named function or equivalent subprogram." }],
  arrays: (): CodeLabTestCase[] => [{ id: "array", label: "Stores a collection", kind: "structure", check: (c) => /\\[[^\\]]*\\]/.test(c), passMessage: "A collection/array literal is present.", failMessage: "Create and use an array or collection." }],
  meaningful: (): CodeLabTestCase[] => [{ id: "implementation", label: "Meaningful implementation", kind: "behaviour", check: (c, o) => c.trim().length >= 50 || o.length > 0, passMessage: "There is a meaningful implementation to inspect.", failMessage: "Write and run a meaningful implementation first." }],
};

function objectiveText(objective: CodeLabObjective) {
  return `${objective.title} ${objective.description ?? ""} ${objective.topic ?? ""}`.toLowerCase();
}

function classifyObjective(objective: CodeLabObjective) {
  const text = objectiveText(objective);
  if (/function|procedure|subprogram/.test(text)) return { skill: "Functions / subprograms", type: "functions" as const, difficulty: 3 as const, task: "Create a reusable subprogram that solves one clearly defined part of the problem." };
  if (/selection|conditional|decision|if statement/.test(text)) return { skill: "Selection", type: "selection" as const, difficulty: 2 as const, task: "Write a program that makes a decision from an input or value and produces the correct result for both paths." };
  if (/repetition|iteration|loop/.test(text)) return { skill: "Iteration", type: "iteration" as const, difficulty: 3 as const, task: "Write a program that repeats a process until the required condition is satisfied." };
  if (/array|list|collection/.test(text)) return { skill: "Arrays / collections", type: "arrays" as const, difficulty: 3 as const, task: "Create a collection of values and use it in a small working solution." };
  if (/variable|constant|data type|data types|store|assignment/.test(text)) return { skill: "Variables and data", type: "variables" as const, difficulty: 1 as const, task: "Declare appropriate values, update them where required, and use them in a working solution." };
  if (/debug|test|trace/.test(text)) return { skill: "Testing and debugging", type: "meaningful" as const, difficulty: 3 as const, task: "Build or repair a small program, run it, inspect the result, and make the implementation behave correctly." };
  if (/algorithm|pseudo|flowchart|trace table/.test(text)) return { skill: "Algorithm design", type: "meaningful" as const, difficulty: 2 as const, task: "Turn the objective into a precise executable solution. Keep the steps ordered, finite and testable." };
  if (/database|sql|web|website|html|css|interface/.test(text)) return { skill: "Applied programming", type: "meaningful" as const, difficulty: 4 as const, task: "Build a small practical implementation that demonstrates the objective rather than only describing it." };
  return { skill: objective.topic || "Programming", type: "meaningful" as const, difficulty: 2 as const, task: "Build a small working implementation that demonstrates the objective. Make the behaviour observable." };
}

export function isCodeLabRelevant(objective: CodeLabObjective) {
  const text = objectiveText(objective);
  return /(program|pseudo|algorithm|flow chart|flowchart|function|procedure|selection|repetition|iteration|debug|test|code|software solution|computer solution|array|database|website|web development|user interface|trace table|develop a program|construct.*pseudo|system development|programming)/.test(text);
}

export function createExercise(objective: CodeLabObjective, curriculum: CodeLabCurriculumIdentity | null, nextObjectiveId?: string): CodeLabExercise {
  const classified = classifyObjective(objective);
  const title = `${objective.objective_key} · ${objective.title}`;
  const prompt = `${classified.task}\n\nCurriculum objective: ${objective.description || objective.title}\n\nUse the editor to implement it, then Run and Check objective.`;
  const starterCode = classified.type === "functions" ? `// Objective: ${objective.objective_key}\n// ${objective.title}\n\nfunction solve() {\n  // Implement the required subprogram.\n}\n\nconsole.log(solve());\n` : DEFAULT_STARTER.replace("// Your solution here", `// Objective: ${objective.objective_key}\n  // ${objective.title}\n  // ${classified.task}`);
  const testCases = classified.type === "sequence" ? tests.sequence(starterCode, []) : tests[classified.type]();
  return {
    exerciseId: `exercise:${curriculum?.syllabusId ?? "foundation"}:${objective.objective_key}`,
    objectiveId: objective.id,
    objectiveKey: objective.objective_key,
    curriculum,
    title,
    prompt,
    starterCode,
    expectedBehaviour: `The implementation should demonstrate: ${objective.description || objective.title}.`,
    difficulty: classified.difficulty,
    hints: ["Start with the smallest working solution.", "Run frequently and use the output to inspect behaviour.", "Compare the implementation against the objective wording, not just whether it runs."],
    skill: classified.skill,
    testCases,
    nextObjectiveId,
  };
}

export function checkExercise(exercise: CodeLabExercise, code: string, output: string[]): ExerciseResult {
  const feedback = exercise.testCases.map((test) => test.check(code, output) ? `✓ ${test.label}: ${test.passMessage}` : `✗ ${test.label}: ${test.failMessage}`);
  const passedCount = exercise.testCases.filter((test) => test.check(code, output)).length;
  return { passed: passedCount === exercise.testCases.length, passedCount, totalCount: exercise.testCases.length, feedback };
}
