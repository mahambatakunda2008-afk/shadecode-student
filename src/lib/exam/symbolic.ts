export type Polynomial = Map<number, number>;

const EPSILON = 1e-12;
const MAX_DEGREE = 12;

function clean(poly: Polynomial): Polynomial {
  const result = new Map<number, number>();
  for (const [degree, coefficient] of poly) {
    if (Math.abs(coefficient) > EPSILON) result.set(degree, coefficient);
  }
  if ([...result.keys()].some((degree) => degree > MAX_DEGREE || degree < 0)) {
    throw new Error(`Polynomial degree cannot exceed ${MAX_DEGREE}`);
  }
  return result;
}

function add(a: Polynomial, b: Polynomial, sign = 1): Polynomial {
  const result = new Map(a);
  for (const [degree, coefficient] of b) result.set(degree, (result.get(degree) ?? 0) + sign * coefficient);
  return clean(result);
}

function multiply(a: Polynomial, b: Polynomial): Polynomial {
  const result: Polynomial = new Map();
  for (const [da, ca] of a) for (const [db, cb] of b) {
    const degree = da + db;
    if (degree > MAX_DEGREE) throw new Error(`Polynomial degree cannot exceed ${MAX_DEGREE}`);
    result.set(degree, (result.get(degree) ?? 0) + ca * cb);
  }
  return clean(result);
}

function scale(poly: Polynomial, value: number): Polynomial {
  return clean(new Map([...poly].map(([degree, coefficient]) => [degree, coefficient * value])));
}

function power(poly: Polynomial, exponent: number): Polynomial {
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > MAX_DEGREE) {
    throw new Error(`Polynomial powers must be whole numbers from 0 to ${MAX_DEGREE}`);
  }
  let result: Polynomial = new Map([[0, 1]]);
  for (let i = 0; i < exponent; i++) result = multiply(result, poly);
  return result;
}

function tokenize(source: string): string[] {
  const tokens: string[] = [];
  const pattern = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([a-zA-Z])|([+\-*/^()]))/gy;
  let position = 0;
  while (position < source.length) {
    pattern.lastIndex = position;
    const match = pattern.exec(source);
    if (!match) throw new Error(`Unsupported algebra input near "${source.slice(position, position + 12)}"`);
    position = pattern.lastIndex;
    tokens.push(match[1] ?? match[2]?.toLowerCase() ?? match[3]);
  }
  const expanded: string[] = [];
  const ends = (token?: string) => !!token && (token === ")" || token === "x" || /^\d/.test(token) || token.startsWith("."));
  const starts = (token?: string) => !!token && (token === "(" || token === "x" || /^\d/.test(token) || token.startsWith("."));
  for (const token of tokens) {
    if (ends(expanded.at(-1)) && starts(token)) expanded.push("*");
    expanded.push(token);
  }
  return expanded;
}

export function parsePolynomial(source: string): Polynomial {
  const tokens = tokenize(source);
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  function primary(): Polynomial {
    const token = take();
    if (token === "x") return new Map([[1, 1]]);
    if (token === "(") {
      const value = sum();
      if (take() !== ")") throw new Error("Missing closing bracket");
      return value;
    }
    if (token && /^\d/.test(token) || token?.startsWith(".")) {
      const value = Number(token);
      if (!Number.isFinite(value)) throw new Error("Invalid coefficient");
      return new Map([[0, value]]);
    }
    throw new Error(`Unexpected algebra token: ${token ?? "end of input"}`);
  }
  function unary(): Polynomial {
    if (peek() === "+") { take(); return unary(); }
    if (peek() === "-") { take(); return scale(unary(), -1); }
    return primaryPower();
  }
  function primaryPower(): Polynomial {
    let value = primary();
    if (peek() === "^") {
      take();
      let sign = 1;
      if (peek() === "+" || peek() === "-") sign = take() === "-" ? -1 : 1;
      const exponentToken = take();
      const exponent = Number(exponentToken) * sign;
      if (!exponentToken || !/^\d+$/.test(exponentToken) || sign < 0) {
        throw new Error("Polynomial powers must be non-negative integers");
      }
      value = power(value, exponent);
    }
    return value;
  }
  function product(): Polynomial {
    let value = unary();
    while (peek() === "*" || peek() === "/") {
      const operator = take();
      const right = unary();
      if (operator === "*") value = multiply(value, right);
      else {
        const divisor = right.get(0) ?? 0;
        if (right.size !== 1 || Math.abs(divisor) < EPSILON) {
          throw new Error("Polynomial division is supported only by a non-zero constant");
        }
        value = scale(value, 1 / divisor);
      }
    }
    return value;
  }
  function sum(): Polynomial {
    let value = product();
    while (peek() === "+" || peek() === "-") {
      const operator = take();
      value = add(value, product(), operator === "+" ? 1 : -1);
    }
    return value;
  }
  if (!tokens.length) throw new Error("Enter a polynomial expression");
  const result = sum();
  if (index !== tokens.length) throw new Error(`Unexpected algebra token: ${peek()}`);
  return clean(result);
}

function coefficientText(value: number): string {
  if (Math.abs(value - Math.round(value)) < EPSILON) return String(Math.round(value));
  return Number(value.toPrecision(10)).toString();
}

export function formatPolynomial(poly: Polynomial): string {
  const terms = [...clean(poly)].sort((a, b) => b[0] - a[0]);
  if (!terms.length) return "0";
  return terms.map(([degree, coefficient], index) => {
    const negative = coefficient < 0;
    const absolute = Math.abs(coefficient);
    const coefficientPart = degree === 0 || Math.abs(absolute - 1) > EPSILON ? coefficientText(absolute) : "";
    const variablePart = degree === 0 ? "" : degree === 1 ? "x" : `x^${degree}`;
    const body = `${coefficientPart}${variablePart}`;
    return index === 0 ? `${negative ? "-" : ""}${body}` : `${negative ? " - " : " + "}${body}`;
  }).join("");
}

export function simplifyPolynomial(source: string): string {
  return formatPolynomial(parsePolynomial(source));
}

export function differentiatePolynomial(source: string): string {
  const derivative = new Map<number, number>();
  for (const [degree, coefficient] of parsePolynomial(source)) {
    if (degree > 0) derivative.set(degree - 1, coefficient * degree);
  }
  return formatPolynomial(clean(derivative));
}

export function integratePolynomial(source: string): string {
  const integral = new Map<number, number>();
  for (const [degree, coefficient] of parsePolynomial(source)) {
    integral.set(degree + 1, coefficient / (degree + 1));
  }
  return `${formatPolynomial(clean(integral))} + C`;
}
