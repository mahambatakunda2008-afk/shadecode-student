/** JSON helpers for model output: fenced responses, LaTeX backslashes and trailing prose are common. */

export function extractJSONObject(raw: string): string | null {
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
    else if (ch === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

/** Strips control characters and doubles backslashes that are not valid JSON escapes (LaTeX such as \Delta, \vec). */
export function cleanJsonText(text: string): string {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
}

export interface SectionBlockLike { type: string; content: string }

/** Parses one generated lesson section; tolerates LaTeX backslashes that make the raw text invalid JSON. */
/** Short checkpoint questions are legitimate; the final section legitimately carries up to 8 blocks. */
export const MIN_SECTION_BLOCK_CHARS = 24;
export const MAX_SECTION_BLOCKS = 10;

export function parseSectionJson<T extends SectionBlockLike>(raw: string): { title: string; blocks: T[] } | null {
  const candidates = [extractJSONObject(raw), extractJSONObject(cleanJsonText(raw))].filter((v): v is string => Boolean(v));
  for (const json of candidates) {
    try {
      const value = JSON.parse(json) as { title?: unknown; blocks?: unknown };
      if (!Array.isArray(value.blocks)) continue;
      const title = typeof value.title === "string" ? value.title : "";
      const blocks = value.blocks.filter((b): b is T =>
        !!b && typeof b === "object" &&
        typeof (b as T).type === "string" &&
        typeof (b as T).content === "string" &&
        (b as T).content.trim().length >= MIN_SECTION_BLOCK_CHARS,
      ).slice(0, MAX_SECTION_BLOCKS);
      if (blocks.length >= 3) return { title: title.trim().slice(0, 255), blocks };
    } catch {
      // try the next candidate
    }
  }
  return null;
}
