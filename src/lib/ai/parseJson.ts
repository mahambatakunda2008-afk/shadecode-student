// Shared recovery for AI responses that are JSON, fenced JSON, or near-valid JSON.
// Keep parsing defensive because every AI feature depends on this boundary.

function extractJSONObject(raw: string): string | null {
  const text = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function cleanJsonText(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
}

export function repairAndParseJSON<T = unknown>(
  raw: string,
  validate?: (value: unknown) => value is T
): T | null {
  const base = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const extracted = extractJSONObject(base);
  const candidates = [
    base,
    extracted,
    extracted ? cleanJsonText(extracted) : null,
    cleanJsonText(base),
  ].filter((v): v is string => Boolean(v));

  const variants: string[] = [];
  for (const candidate of candidates) {
    variants.push(candidate);
    const bracketFix = candidate.replace(/([}\]])(\s*)([{[])/g, "$1,$2$3");
    variants.push(bracketFix);
    const commaFix = bracketFix.replace(
      /(true|false|null|"|\d)(\s*\n\s*)"([a-zA-Z_][\w-]*)"\s*:/g,
      '$1,$2"$3":'
    );
    variants.push(commaFix);
    variants.push(commaFix.replace(/,(\s*[}\]])/g, "$1"));
    variants.push(commaFix.replace(/,(\s*[}\]])/g, "$1").replace(/\\(?!["\\/bfnrtu])/g, "\\\\"));
  }

  const seen = new Set<string>();
  for (const candidate of variants) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    try {
      const json = extractJSONObject(candidate) ?? candidate;
      const parsed = JSON.parse(json);
      if (!validate || validate(parsed)) return parsed as T;
    } catch {
      // Try the next recovery stage.
    }
  }
  return null;
}
