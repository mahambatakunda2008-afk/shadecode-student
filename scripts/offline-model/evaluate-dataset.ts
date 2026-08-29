import fs from "node:fs";

const allowedCapabilities = new Set(["tutor", "project-coach", "study-planner", "question-generator", "summarizer"]);
const allowedVerification = new Set(["verified", "reviewed", "synthetic"]);

export type DistillationExample = {
  id: string;
  capability: string;
  subject: string;
  level: string;
  prompt: string;
  response: string;
  verification: { type: string; status: string; source?: string };
};

export function validateExample(example: DistillationExample): string[] {
  const errors: string[] = [];
  if (!example.id?.trim()) errors.push("missing id");
  if (!allowedCapabilities.has(example.capability)) errors.push("unsupported capability");
  if (!example.subject?.trim()) errors.push("missing subject");
  if (!example.level?.trim()) errors.push("missing level");
  if (!example.prompt?.trim()) errors.push("missing prompt");
  if (!example.response?.trim()) errors.push("missing response");
  if (!example.verification || !allowedVerification.has(example.verification.status)) errors.push("invalid verification status");
  return errors;
}

export function validateJsonl(path: string): { total: number; valid: number; errors: Array<{ line: number; issues: string[] }> } {
  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  const errors: Array<{ line: number; issues: string[] }> = [];
  lines.forEach((line, index) => {
    try {
      const issues = validateExample(JSON.parse(line) as DistillationExample);
      if (issues.length) errors.push({ line: index + 1, issues });
    } catch {
      errors.push({ line: index + 1, issues: ["invalid JSON"] });
    }
  });
  return { total: lines.length, valid: lines.length - errors.length, errors };
}
