export interface CortexOutputFailure {
  code: "empty" | "not_object" | "placeholder" | "text_too_short" | "text_too_long";
  path?: string;
  message: string;
}

export interface CortexOutputValidation {
  ok: boolean;
  failures: CortexOutputFailure[];
}

const PLACEHOLDER_PATTERNS = [
  /^error$/i,
  /^n\/a$/i,
  /^unknown$/i,
  /^tbd$/i,
  /^placeholder$/i,
  /temporarily unavailable/i,
  /please try again/i,
  /could not (?:generate|complete|answer|determine)/i,
];

export function parseCortexJson(value: string): unknown {
  const cleaned = value.trim();
  const fenced = cleaned.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/i);
  const candidate = (fenced ? fenced[1] : cleaned).trim();

  try {
    return JSON.parse(candidate);
  } catch {}

  const objectStart = candidate.indexOf("{");
  const objectEnd = candidate.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    try {
      return JSON.parse(candidate.slice(objectStart, objectEnd + 1));
    } catch {}
  }

  const arrayStart = candidate.indexOf("[");
  const arrayEnd = candidate.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    try {
      return JSON.parse(candidate.slice(arrayStart, arrayEnd + 1));
    } catch {}
  }

  throw new Error("Cortex returned malformed structured output.");
}

function validateString(path: string, text: string, minTextLength: number, maxTextLength: number, failures: CortexOutputFailure[]) {
  const value = text.trim();
  if (!value) {
    failures.push({ code: "empty", path, message: `Field ${path} is empty.` });
    return;
  }
  if (value.length < minTextLength && /(?:content|explanation|solution|feedback|hint|method|overview|evidence|answer|tip)/i.test(path)) {
    failures.push({ code: "text_too_short", path, message: `Field ${path} is too short to be useful.` });
  }
  if (value.length > maxTextLength) {
    failures.push({ code: "text_too_long", path, message: `Field ${path} is too large.` });
  }
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value))) {
    failures.push({ code: "placeholder", path, message: `Field ${path} contains placeholder or failure text.` });
  }
}

function walk(value: unknown, path: string, minTextLength: number, maxTextLength: number, failures: CortexOutputFailure[], depth = 0) {
  if (depth > 5 || value === null || value === undefined) return;
  if (typeof value === "string") {
    validateString(path, value, minTextLength, maxTextLength, failures);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, minTextLength, maxTextLength, failures, depth + 1));
    return;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      walk(child, path ? `${path}.${key}` : key, minTextLength, maxTextLength, failures, depth + 1);
    }
  }
}

export function validateCortexObject(
  value: unknown,
  options: { minTextLength?: number; maxTextLength?: number } = {},
): CortexOutputValidation {
  const failures: CortexOutputFailure[] = [];
  const minTextLength = options.minTextLength ?? 1;
  const maxTextLength = options.maxTextLength ?? 20000;

  if (value === null || value === undefined) {
    return { ok: false, failures: [{ code: "empty", message: "Cortex returned no output." }] };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, failures: [{ code: "not_object", message: "Cortex structured output must be an object." }] };
  }

  walk(value, "", minTextLength, maxTextLength, failures);
  return { ok: failures.length === 0, failures };
}

export function assertCortexObject(
  value: unknown,
  options?: { minTextLength?: number; maxTextLength?: number },
): void {
  const result = validateCortexObject(value, options);
  if (!result.ok) {
    throw new Error(
      "Cortex output failed shared QA: " +
        result.failures.map((failure) => failure.message).join(" "),
    );
  }
}
