import { executeCode, type RuntimeDiagnostic, type RuntimeLanguage } from "./runtime";

export type TestCase = {
  id: string;
  name: string;
  /**
   * Test program. Use {{ENTRY_FILE}} to reference the learner entry module.
   * Example: import "{{ENTRY_FILE}}";
   *
   * Keeping the placeholder in the test definition lets the runner safely
   * adapt it to the actual workspace path instead of asking curriculum data
   * to guess a file name.
   */
  code: string;
  expectedOutput?: string;
  timeoutMs?: number;
};

export type CodeLabTestResult = {
  id: string;
  name: string;
  status: "passed" | "failed" | "error";
  expectedOutput?: string;
  actualOutput: string;
  diagnostics: RuntimeDiagnostic[];
  durationMs: number;
  message: string;
};

export type CodeLabTestRun = {
  passed: number;
  failed: number;
  errors: number;
  durationMs: number;
  results: CodeLabTestResult[];
};

function normalizeOutput(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function moduleSpecifier(entryFile: string) {
  const normalized = entryFile.replace(/\\/g, "/").replace(/^\/+/, "");
  return `./${normalized}`;
}

/**
 * Resolve a curriculum test against the learner's actual entry file.
 *
 * A test that does not use {{ENTRY_FILE}} remains a standalone test program,
 * preserving the original contract. This is useful for language runtimes
 * where the test harness is itself the executable program.
 */
export function resolveTestCode(testCode: string, entryFile: string) {
  return testCode.replace(/\{\{ENTRY_FILE\}\}/g, moduleSpecifier(entryFile));
}

export async function runCodeLabTests({
  language,
  files,
  entryFile,
  tests,
}: {
  language: RuntimeLanguage;
  files: Array<{ path: string; content: string }>;
  entryFile: string;
  tests: TestCase[];
}): Promise<CodeLabTestRun> {
  const started = performance.now();
  const results: CodeLabTestResult[] = [];

  for (const test of tests) {
    const result = await executeCode({
      id: `test:${test.id}`,
      language,
      code: resolveTestCode(test.code, entryFile),
      files,
      entryFile,
      timeoutMs: test.timeoutMs ?? 5000,
    });

    const stdout = normalizeOutput(
      result.events
        .filter((event) => event.type === "stdout")
        .map((event) => event.text)
        .join("\n"),
    );
    const expected = test.expectedOutput == null ? undefined : normalizeOutput(test.expectedOutput);
    const runtimeFailed = result.exitCode !== 0 || result.diagnostics.some((diagnostic) => diagnostic.severity === "error");
    const passed = !runtimeFailed && (expected == null || stdout === expected);

    results.push({
      id: test.id,
      name: test.name,
      status: runtimeFailed ? "error" : passed ? "passed" : "failed",
      expectedOutput: expected,
      actualOutput: stdout,
      diagnostics: result.diagnostics,
      durationMs: result.durationMs,
      message: runtimeFailed
        ? "The test program produced a runtime diagnostic."
        : passed
          ? "Test passed."
          : `Expected ${JSON.stringify(expected)} but received ${JSON.stringify(stdout)}.`,
    });
  }

  return {
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "failed").length,
    errors: results.filter((result) => result.status === "error").length,
    durationMs: Math.round(performance.now() - started),
    results,
  };
}
