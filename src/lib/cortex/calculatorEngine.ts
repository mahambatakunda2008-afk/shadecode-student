/** Deterministic calculator engine. No eval(), no network, no AI. */

export type CalculatorResult = { ok: true; value: number; display: string } | { ok: false; error: "invalid_expression" | "division_by_zero" | "overflow" };

const MAX_LENGTH = 256;
const MAX_ABS = 1e100;

export function evaluateExpression(input: string): CalculatorResult {
  const source = input.trim();
  if (!source || source.length > MAX_LENGTH) return { ok: false, error: "invalid_expression" };
  const tokens = tokenize(source);
  if (!tokens) return { ok: false, error: "invalid_expression" };
  let position = 0;
  const parsePrimary = (): number | null => {
    const token = tokens[position];
    if (token === "(") { position++; const value = parseAdditive(); if (tokens[position] !== ")") return null; position++; return value; }
    if (token === "+" || token === "-") { position++; const value = parsePrimary(); return value === null ? null : token === "-" ? -value : value; }
    if (!token || !/^\d+(?:\.\d+)?$/.test(token)) return null;
    position++; const value = Number(token); return Number.isFinite(value) ? value : null;
  };
  const parseMultiplicative = (): number | null => {
    let left = parsePrimary();
    while (left !== null && (tokens[position] === "*" || tokens[position] === "/" || tokens[position] === "%")) {
      const op = tokens[position++]; const right = parsePrimary(); if (right === null) return null;
      if ((op === "/" || op === "%") && right === 0) throw new Error("division_by_zero");
      left = op === "*" ? left * right : op === "/" ? left / right : left % right;
      if (!Number.isFinite(left) || Math.abs(left) > MAX_ABS) throw new Error("overflow");
    }
    return left;
  };
  function parseAdditive(): number | null {
    let left = parseMultiplicative();
    while (left !== null && (tokens[position] === "+" || tokens[position] === "-")) {
      const op = tokens[position++]; const right = parseMultiplicative(); if (right === null) return null;
      left = op === "+" ? left + right : left - right;
      if (!Number.isFinite(left) || Math.abs(left) > MAX_ABS) throw new Error("overflow");
    }
    return left;
  }
  try {
    const value = parseAdditive();
    if (value === null || position !== tokens.length || !Number.isFinite(value)) return { ok: false, error: "invalid_expression" };
    return { ok: true, value, display: formatResult(value) };
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_expression";
    return { ok: false, error: code === "division_by_zero" ? "division_by_zero" : code === "overflow" ? "overflow" : "invalid_expression" };
  }
}

function tokenize(source: string): string[] | null {
  const tokens: string[] = []; let i = 0;
  while (i < source.length) {
    const char = source[i];
    if (/\s/.test(char)) { i++; continue; }
    if (/[()+\-*/%]/.test(char)) { tokens.push(char); i++; continue; }
    if (/\d/.test(char)) {
      const match = source.slice(i).match(/^\d+(?:\.\d+)?/); if (!match) return null;
      tokens.push(match[0]); i += match[0].length; continue;
    }
    return null;
  }
  return tokens.length ? tokens : null;
}

function formatResult(value: number): string {
  if (Object.is(value, -0)) value = 0;
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(12)));
}
