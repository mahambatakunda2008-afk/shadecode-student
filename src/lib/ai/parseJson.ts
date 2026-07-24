// src/lib/ai/parseJson.ts
//
// AI models occasionally return near-valid JSON: a missing comma between
// array elements, a trailing comma before a closing bracket, or an
// unescaped backslash. A naive `JSON.parse(text.match(/\{[\s\S]*\}/)[0])`
// throws on all of these and kills the whole request — this is exactly
// what was happening in /api/exam/mark (see "Marking error: SyntaxError:
// Expected ',' or ']' after array element" in production logs).
//
// This applies the same multi-stage recovery already proven in
// src/app/api/learn/route.ts's local safeParseJSON, generalized so any
// route can use it instead of each maintaining its own copy.

/**
 * Attempt to parse `raw` as JSON, trying progressively more aggressive
 * repairs if the direct parse fails. Returns null if every stage fails.
 *
 * `validate` lets the caller reject a structurally-valid-but-wrong-shape
 * result (e.g. parsed but missing an expected array) so repair can keep
 * trying other stages instead of returning something unusable.
 */
export function repairAndParseJSON<T = unknown>(
  raw: string,
  validate?: (value: unknown) => value is T
): T | null {
  const text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  const attempt = (candidate: string): T | null => {
    try {
      const match = candidate.match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);
      if (validate && !validate(parsed)) return null;
      return parsed as T;
    } catch {
      return null;
    }
  };

  // Stage 1: direct parse
  const direct = attempt(text);
  if (direct) return direct;

  // Stage 2: missing comma between adjacent object/array boundaries —
  // "}{" or "]{" is never valid JSON on its own, always a missing comma.
  const bracketFix = text.replace(/([}\]])(\s*)([{[])/g, "$1,$2$3");
  const bracketFixed = attempt(bracketFix);
  if (bracketFixed) return bracketFixed;

  // Stage 3: missing comma between a value and the next quoted key on a
  // new line, e.g. `"score": 4\n  "maxScore": 5` (no comma after 4).
  const commaFix = bracketFix.replace(
    /(true|false|null|"|\d)(\s*\n\s*)"([a-zA-Z_][\w-]*)"\s*:/g,
    '$1,$2"$3":'
  );
  const commaFixed = attempt(commaFix);
  if (commaFixed) return commaFixed;

  // Stage 4: trailing comma before a closing bracket
  const trailingFix = commaFix.replace(/,(\s*[}\]])/g, "$1");
  const trailingFixed = attempt(trailingFix);
  if (trailingFixed) return trailingFixed;

  // Stage 5: fix unescaped backslashes
  const backslashFix = trailingFix.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
  const backslashFixed = attempt(backslashFix);
  if (backslashFixed) return backslashFixed;

  // Stage 6: strip all backslashes (last resort — loses literal backslash
  // characters, but recovers everything else, which matters more for
  // short marking feedback than exact backslash preservation)
  const stripped = backslashFix.replace(/\\/g, "");
  const strippedResult = attempt(stripped);
  if (strippedResult) return strippedResult;

  return null;
}
