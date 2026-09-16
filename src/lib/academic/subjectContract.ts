export function normalizeSubjectKey(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isGeneralSubject(value: unknown): boolean {
  return normalizeSubjectKey(value) === "general";
}

export function normalizeSubjectNames(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const name = value.trim();
    const key = normalizeSubjectKey(name);
    if (!key || key === "general" || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

export function isAllowedSubject(value: unknown, allowedSubjects: unknown): boolean {
  const key = normalizeSubjectKey(value);
  if (!key || key === "general") return false;
  return normalizeSubjectNames(allowedSubjects).some((subject) => normalizeSubjectKey(subject) === key);
}

export function matchAllowedSubject(value: unknown, allowedSubjects: unknown): string | null {
  const key = normalizeSubjectKey(value);
  if (!key || key === "general") return null;
  return normalizeSubjectNames(allowedSubjects).find((subject) => normalizeSubjectKey(subject) === key) ?? null;
}
