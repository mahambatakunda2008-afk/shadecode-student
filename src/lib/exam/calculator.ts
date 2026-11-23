export type CalculatorScope = Record<string, number>;

type Token = { type: "number" | "name" | "operator" | "left" | "right" | "comma"; value: string };

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  abs: Math.abs, sqrt: Math.sqrt, cbrt: Math.cbrt, exp: Math.exp,
  ln: Math.log, log: (x) => Math.log10(x), log10: Math.log10, log2: Math.log2,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  floor: Math.floor, ceil: Math.ceil, round: Math.round, trunc: Math.trunc,
  min: Math.min, max: Math.max, sign: Math.sign, hypot: Math.hypot,
  sec: (x) => 1 / Math.cos(x), cosec: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x),
  asind: (x) => Math.asin(x) * 180 / Math.PI, acosd: (x) => Math.acos(x) * 180 / Math.PI,
  atand: (x) => Math.atan(x) * 180 / Math.PI,
};

function tokenize(source: string): Token[] {
  const clean = source.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/π/g, "pi").replace(/√/g, "sqrt");
  const raw: Token[] = [];
  const re = /\s*(?:(\d+(?:\.\d*)?(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?)|([a-zA-Z_][a-zA-Z_0-9]*)|(\*\*|[+\-*/^%!])|(\()|(\))|(,))/gy;
  let pos = 0;
  while (pos < clean.length) {
    re.lastIndex = pos;
    const m = re.exec(clean);
    if (!m) throw new Error(`Unrecognised input near "${clean.slice(pos, pos + 12)}"`);
    pos = re.lastIndex;
    if (m[1]) raw.push({ type: "number", value: m[1] });
    else if (m[2]) raw.push({ type: "name", value: m[2].toLowerCase() });
    else if (m[3]) raw.push({ type: "operator", value: m[3] });
    else if (m[4]) raw.push({ type: "left", value: "(" });
    else if (m[5]) raw.push({ type: "right", value: ")" });
    else if (m[6]) raw.push({ type: "comma", value: "," });
  }
  const out: Token[] = [];
  const ends = (t?: Token) => !!t && (t.type === "number" || t.type === "right" || (t.type === "name" && !FUNCTIONS[t.value]));
  const starts = (t?: Token) => !!t && (t.type === "number" || t.type === "left" || t.type === "name");
  for (const token of raw) {
    const prev = out[out.length - 1];
    if (ends(prev) && starts(token)) out.push({ type: "operator", value: "*" });
    out.push(token);
  }
  return out;
}

export function evaluateExpression(source: string, scope: CalculatorScope = {}, angle: "DEG" | "RAD" = "RAD"): number {
  const tokens = tokenize(source);
  let cursor = 0;
  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];
  const constants: CalculatorScope = { pi: Math.PI, e: Math.E, phi: (1 + Math.sqrt(5)) / 2, tau: 2 * Math.PI, ...scope };
  const factorial = (n: number) => {
    if (!Number.isInteger(n) || n < 0 || n > 170) throw new Error("Factorial requires an integer from 0 to 170");
    let v = 1; for (let i = 2; i <= n; i++) v *= i; return v;
  };
  const trigScope = angle === "DEG" ? Math.PI / 180 : 1;
  function expression(minBinding = 0): number {
    let token = take();
    if (!token) throw new Error("Enter an expression");
    let left: number;
    if (token.type === "number") left = Number(token.value);
    else if (token.type === "operator" && (token.value === "+" || token.value === "-")) left = (token.value === "-" ? -1 : 1) * expression(35);
    else if (token.type === "left") {
      left = expression(0);
      if (take()?.type !== "right") throw new Error("Missing closing bracket");
    } else if (token.type === "name") {
      if (FUNCTIONS[token.value]) {
        let args: number[] = [];
        if (peek()?.type === "left") {
          take();
          if (peek()?.type !== "right") {
            do { args.push(expression(0)); if (peek()?.type !== "comma") break; take(); } while (true);
          }
          if (take()?.type !== "right") throw new Error("Missing closing bracket in function");
        } else args = [expression(35)];
        const fn = FUNCTIONS[token.value];
        if (["sin", "cos", "tan", "sec", "cosec", "cot"].includes(token.value)) args[0] *= trigScope;
        left = fn(...args);
      } else {
        const value = constants[token.value];
        if (value === undefined) throw new Error(`Unknown variable: ${token.value}`);
        left = value;
      }
    } else throw new Error(`Unexpected token: ${token.value}`);

    while (peek()) {
      const op = peek()!;
      if (op.type === "operator" && (op.value === "!" || op.value === "%")) {
        if (45 < minBinding) break;
        take(); left = op.value === "!" ? factorial(left) : left / 100; continue;
      }
      if (op.type !== "operator") break;
      const power = op.value === "+" || op.value === "-" ? 10 : op.value === "*" || op.value === "/" ? 20 : 30;
      if (power < minBinding) break;
      take();
      const right = expression(power + (op.value === "^" || op.value === "**" ? 0 : 1));
      if (op.value === "+") left += right;
      else if (op.value === "-") left -= right;
      else if (op.value === "*") left *= right;
      else if (op.value === "/") left /= right;
      else if (op.value === "^" || op.value === "**") left = Math.pow(left, right);
    }
    return left;
  }
  const value = expression();
  if (cursor !== tokens.length) throw new Error(`Unexpected token: ${tokens[cursor].value}`);
  if (!Number.isFinite(value)) throw new Error("Result is not a finite real number");
  return value;
}

export function derivative(source: string, x: number, angle: "DEG" | "RAD" = "RAD"): number {
  const h = Math.max(1e-5, Math.abs(x) * 1e-5);
  const f = (v: number) => evaluateExpression(source, { x: v }, angle);
  return (f(x - 2*h) - 8*f(x - h) + 8*f(x + h) - f(x + 2*h)) / (12*h);
}

export function definiteIntegral(source: string, a: number, b: number, angle: "DEG" | "RAD" = "RAD"): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error("Integration limits must be finite");
  const n = 1000;
  const h = (b - a) / n;
  const f = (x: number) => evaluateExpression(source, { x }, angle);
  let sum = f(a) + f(b);
  for (let i = 1; i < n; i++) sum += (i % 2 ? 4 : 2) * f(a + i*h);
  return sum * h / 3;
}

export function solveByBisection(source: string, a: number, b: number, angle: "DEG" | "RAD" = "RAD"): number {
  let lo = a, hi = b, flo = evaluateExpression(source, { x: lo }, angle), fhi = evaluateExpression(source, { x: hi }, angle);
  if (flo === 0) return lo; if (fhi === 0) return hi;
  if (flo * fhi > 0) throw new Error("The interval must bracket a root (the endpoint values need opposite signs)");
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2, fm = evaluateExpression(source, { x: mid }, angle);
    if (Math.abs(fm) < 1e-12 || Math.abs(hi - lo) < 1e-12) return mid;
    if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return (lo + hi) / 2;
}

export function descriptiveStatistics(values: number[]) {
  if (!values.length || values.some((v) => !Number.isFinite(v))) throw new Error("Enter a list of finite numbers");
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0), mean = sum / values.length;
  const median = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { count: values.length, sum, mean, median, min: sorted[0], max: sorted[sorted.length - 1], range: sorted[sorted.length - 1] - sorted[0], variance, standardDeviation: Math.sqrt(variance) };
}

export function formatResult(value: number, precision = 10): string {
  if (Object.is(value, -0)) value = 0;
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  return Number(value.toPrecision(precision)).toString();
}
