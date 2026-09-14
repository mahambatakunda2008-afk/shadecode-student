export type SourceEvidenceResult = {
  status: "passed" | "failed" | "error";
  detail: string;
};

export type SourceEvidenceCheck = {
  pattern: string;
  flags?: string;
  message: string;
};

const SOURCE_EXTENSIONS = new Set([
  "js", "jsx", "mjs", "cjs", "ts", "tsx", "py", "java", "cs", "vb",
  "c", "h", "cc", "cpp", "cxx", "hpp", "kt", "kts", "php", "rs", "go", "sql",
  "html", "htm", "css", "scss", "json", "xml", "pseudocode", "txt",
]);

function isSourcePath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  return SOURCE_EXTENSIONS.has(extension);
}

/**
 * Build source text without README/docs noise. File headers are retained so
 * diagnostics and future source-aware tooling can still identify evidence.
 */
export function sourceTextForChecks(files: Array<{ path: string; content: string }>) {
  return files
    .filter((file) => isSourcePath(file.path))
    .map((file) => `// FILE: ${file.path}\n${file.content}`)
    .join("\n\n");
}

export function evaluateSourceEvidence(check: SourceEvidenceCheck, files: Array<{ path: string; content: string }>): SourceEvidenceResult {
  try {
    const matched = new RegExp(check.pattern, check.flags).test(sourceTextForChecks(files));
    return matched
      ? { status: "passed", detail: "Source evidence found." }
      : { status: "failed", detail: check.message };
  } catch (cause) {
    return {
      status: "error",
      detail: `Source check could not run: ${cause instanceof Error ? cause.message : String(cause)}`,
    };
  }
}
