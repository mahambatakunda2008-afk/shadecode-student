export type AlgorithmContext = "school" | "secondary" | "sixth-form" | "university" | "polytechnic" | "professional";
export type AlgorithmQuestionType = "write" | "trace" | "flowchart" | "complexity" | "test";

export type AlgorithmObjective = {
  id: string;
  title: string;
  description: string;
  contexts: AlgorithmContext[];
  tags: string[];
  officialReference?: string;
};

export type AlgorithmExercise = {
  id: string;
  title: string;
  objectiveId: string;
  questionType: AlgorithmQuestionType;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prompt: string;
  starterCode?: string;
  testInputs?: string[];
  expectedOutputs?: string[];
  syllabusReferences?: string[];
  contexts: AlgorithmContext[];
};

const ALL_CONTEXTS: AlgorithmContext[] = ["school", "secondary", "sixth-form", "university", "polytechnic", "professional"];

/**
 * These are board-neutral computing competencies. They are deliberately not
 * presented as official Cambridge, ZIMSEC or university syllabus wording.
 * Official syllabus/objective IDs can be attached through officialReference.
 */
export const ALGORITHM_OBJECTIVES: AlgorithmObjective[] = [
  { id: "alg.input-output", title: "Input, output and assignment", description: "Design a clear algorithm that receives data, processes it and produces a result.", contexts: ALL_CONTEXTS, tags: ["input", "output", "assignment"] },
  { id: "alg.sequence", title: "Sequential problem solving", description: "Translate a problem into ordered, unambiguous algorithmic steps.", contexts: ALL_CONTEXTS, tags: ["sequence", "logic"] },
  { id: "alg.selection", title: "Selection", description: "Use IF, ELSE and CASE-style decisions to control algorithm behaviour.", contexts: ALL_CONTEXTS, tags: ["selection", "if", "case"] },
  { id: "alg.iteration", title: "Iteration", description: "Use FOR, WHILE and REPEAT-style loops safely and correctly.", contexts: ALL_CONTEXTS, tags: ["iteration", "loops"] },
  { id: "alg.arrays", title: "Arrays and lists", description: "Store, access and process collections of values using indexed data structures.", contexts: ALL_CONTEXTS, tags: ["arrays", "lists", "data"] },
  { id: "alg.subroutines", title: "Procedures and functions", description: "Decompose algorithms into reusable subroutines with parameters and return values.", contexts: ALL_CONTEXTS, tags: ["procedures", "functions", "decomposition"] },
  { id: "alg.tracing", title: "Tracing and dry runs", description: "Trace changing variables through an algorithm and explain its state at each step.", contexts: ALL_CONTEXTS, tags: ["trace", "dry-run", "debugging"] },
  { id: "alg.testing", title: "Algorithm testing", description: "Design normal, boundary and invalid test cases and compare actual results with expected results.", contexts: ALL_CONTEXTS, tags: ["testing", "boundary", "validation"] },
  { id: "alg.complexity", title: "Algorithm efficiency", description: "Reason about time and space growth from control structures and data usage.", contexts: ["sixth-form", "university", "polytechnic", "professional"], tags: ["complexity", "big-o", "efficiency"] },
  { id: "alg.flowcharts", title: "Algorithm representation", description: "Represent an algorithm with flowchart structures and maintain consistency with its pseudocode.", contexts: ALL_CONTEXTS, tags: ["flowchart", "representation"] },
];

const START_LARGEST = `INPUT A
INPUT B
INPUT C
Largest <- A
IF B > Largest THEN
    Largest <- B
END IF
IF C > Largest THEN
    Largest <- C
END IF
OUTPUT Largest`;

export const ALGORITHM_EXERCISES: AlgorithmExercise[] = [
  { id: "largest-three", title: "Find the largest of three", objectiveId: "alg.selection", questionType: "write", difficulty: 1, prompt: "Write an algorithm that accepts three numbers and outputs the largest value.", starterCode: START_LARGEST, testInputs: ["12\n7\n19", "5\n18\n11", "3\n3\n2"], expectedOutputs: ["19", "18", "3"], contexts: ALL_CONTEXTS },
  { id: "sum-one-to-n", title: "Sum from 1 to N", objectiveId: "alg.iteration", questionType: "write", difficulty: 2, prompt: "Write an algorithm that accepts N and outputs the sum of all integers from 1 to N.", starterCode: "INPUT N\nTotal <- 0\nFOR I <- 1 TO N\n    Total <- Total + I\nEND FOR\nOUTPUT Total", testInputs: ["5", "1", "10"], expectedOutputs: ["15", "1", "55"], contexts: ALL_CONTEXTS },
  { id: "array-total", title: "Array total", objectiveId: "alg.arrays", questionType: "write", difficulty: 3, prompt: "Read five values into an array and output their total.", starterCode: "DECLARE Values AS ARRAY\nFOR I <- 1 TO 5\n    INPUT X\n    Values[I] <- X\nEND FOR\nTotal <- 0\nFOR I <- 1 TO 5\n    Total <- Total + Values[I]\nEND FOR\nOUTPUT Total", testInputs: ["1\n2\n3\n4\n5", "10\n0\n-2\n7\n5"], expectedOutputs: ["15", "20"], contexts: ALL_CONTEXTS },
  { id: "trace-selection", title: "Trace a selection", objectiveId: "alg.tracing", questionType: "trace", difficulty: 2, prompt: "Run the algorithm and inspect how Largest changes as each input is considered.", starterCode: START_LARGEST, testInputs: ["9\n4\n12"], expectedOutputs: ["12"], contexts: ALL_CONTEXTS },
  { id: "boundary-tests", title: "Choose boundary tests", objectiveId: "alg.testing", questionType: "test", difficulty: 3, prompt: "Create test cases that challenge an algorithm at its smallest, largest, equal-value and invalid-input boundaries.", contexts: ALL_CONTEXTS },
  { id: "complexity-nested", title: "Analyse nested loops", objectiveId: "alg.complexity", questionType: "complexity", difficulty: 4, prompt: "Determine the dominant time complexity of an algorithm containing one loop nested inside another loop.", contexts: ["sixth-form", "university", "polytechnic", "professional"] },
];

export function getAlgorithmExercise(id: string) { return ALGORITHM_EXERCISES.find((exercise) => exercise.id === id); }
export function getAlgorithmObjective(id: string) { return ALGORITHM_OBJECTIVES.find((objective) => objective.id === id); }

export function normalizeOutput(value: string) {
  return value.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean).join("\n").trim();
}

export function compareExpectedOutput(actual: string, expected?: string) {
  if (expected === undefined) return { checked: false, passed: true };
  return { checked: true, passed: normalizeOutput(actual) === normalizeOutput(expected) };
}

export function recordAlgorithmEvidence(input: { exerciseId: string; objectiveId: string; passed: boolean; testCount: number; durationMs: number }) {
  return {
    type: "comp-lab.algorithm-assessment",
    exerciseId: input.exerciseId,
    objectiveId: input.objectiveId,
    passed: input.passed,
    testCount: input.testCount,
    durationMs: Math.round(input.durationMs),
    recordedAt: new Date().toISOString(),
  } as const;
}
