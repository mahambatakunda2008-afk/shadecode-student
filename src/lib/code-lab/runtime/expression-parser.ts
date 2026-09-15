export type ExpressionValue = number | string | boolean;

export type ExpressionContext = Record<string, ExpressionValue | ExpressionValue[]>;

type Token =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "identifier"; value: string }
  | { kind: "operator"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "comma" }
  | { kind: "eof" };

const IDENTIFIER = /^[A-Za-z_]\w*/;
const NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)/;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const rest = input.slice(i);
    if (/^\s+/.test(rest)) { i += rest.match(/^\s+/)![0].length; continue; }
    if (rest[0] === "\"" || rest[0] === "'") {
      const quote = rest[0]; let j = 1; let value = "";
      while (j < rest.length && rest[j] !== quote) {
        if (rest[j] === "\\" && j + 1 < rest.length) { value += rest[j + 1]; j += 2; } else { value += rest[j++]; }
      }
      if (j >= rest.length) throw new Error("Unterminated string literal.");
      tokens.push({ kind: "string", value }); i += j + 1; continue;
    }
    const number = rest.match(NUMBER);
    if (number) { tokens.push({ kind: "number", value: Number(number[0]) }); i += number[0].length; continue; }
    const identifier = rest.match(IDENTIFIER);
    if (identifier) {
      const word = identifier[0]; const upper = word.toUpperCase();
      if (upper === "TRUE" || upper === "FALSE") tokens.push({ kind: "boolean", value: upper === "TRUE" });
      else if (["AND","OR","NOT","MOD","DIV"].includes(upper)) tokens.push({ kind: "operator", value: upper });
      else tokens.push({ kind: "identifier", value: word });
      i += word.length; continue;
    }
    const two = rest.slice(0, 2);
    if (["<=", ">=", "!=", "<>", "=="].includes(two)) { tokens.push({ kind: "operator", value: two }); i += 2; continue; }
    if (["+", "-", "*", "/", "%", "<", ">", "=", "!"].includes(rest[0])) { tokens.push({ kind: "operator", value: rest[0] }); i += 1; continue; }
    if (rest[0] === "(") { tokens.push({ kind: "lparen" }); i++; continue; }
    if (rest[0] === ")") { tokens.push({ kind: "rparen" }); i++; continue; }
    if (rest[0] === ",") { tokens.push({ kind: "comma" }); i++; continue; }
    if (rest[0] === "[") { tokens.push({ kind: "operator", value: "[" }); i++; continue; }
    if (rest[0] === "]") { tokens.push({ kind: "operator", value: "]" }); i++; continue; }
    throw new Error(`Unsupported expression character: ${rest[0]}`);
  }
  tokens.push({ kind: "eof" });
  return tokens;
}

function numeric(value: ExpressionValue | ExpressionValue[]) {
  if (typeof value === "number") return value;
  const n = Number(value); return Number.isFinite(n) ? n : 0;
}

function truthy(value: ExpressionValue | ExpressionValue[]) {
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" ? value.length > 0 : value !== 0;
}

function equal(a: ExpressionValue | ExpressionValue[], b: ExpressionValue | ExpressionValue[]) {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a) === JSON.stringify(b);
  return a === b || (numeric(a) === numeric(b) && Number.isFinite(numeric(a)) && Number.isFinite(numeric(b)));
}

export function evaluateExpression(input: string, context: ExpressionContext): ExpressionValue | ExpressionValue[] {
  const tokens = tokenize(input.replace(/<>/g, "!=").replace(/\bDIV\b/gi, "DIV").replace(/\bMOD\b/gi, "MOD"));
  let position = 0;
  const peek = () => tokens[position];
  const consume = () => tokens[position++];
  const expect = (kind: Token["kind"]) => { const token = consume(); if (token.kind !== kind) throw new Error(`Expected ${kind}.`); return token; };

  const primary = (): ExpressionValue | ExpressionValue[] => {
    const token = consume();
    if (token.kind === "number" || token.kind === "string" || token.kind === "boolean") return token.value;
    if (token.kind === "identifier") {
      const upper = token.value.toUpperCase();
      if (upper === "LENGTH" && peek().kind === "lparen") { consume(); const value = primary(); expect("rparen"); return Array.isArray(value) || typeof value === "string" ? value.length : 0; }
      const value = context[token.value] ?? context[upper];
      if (value === undefined) return token.value;
      if (peek().kind === "operator" && (peek() as Extract<Token,{kind:"operator"}>).value === "[") {
        consume(); const index = numeric(orExpr());
        const close = consume(); if (close.kind !== "operator" || close.value !== "]") throw new Error("Missing ] in array access.");
        return Array.isArray(value) ? value[Math.max(0, Math.trunc(index) - 1)] ?? "" : "";
      }
      return value;
    }
    if (token.kind === "lparen") { const value = orExpr(); expect("rparen"); return value; }
    throw new Error("Expected a value.");
  };
  const unary = (): ExpressionValue | ExpressionValue[] => {
    if (peek().kind === "operator") {
      const op = (peek() as Extract<Token,{kind:"operator"}>).value;
      if (op === "NOT" || op === "!" || op === "+" || op === "-") { consume(); const value = unary(); if (op === "NOT" || op === "!") return !truthy(value); return op === "-" ? -numeric(value) : numeric(value); }
    }
    return primary();
  };
  const multiplicative = () => { let left = unary(); while (peek().kind === "operator" && ["*","/","%","MOD","DIV"].includes((peek() as Extract<Token,{kind:"operator"}>).value)) { const op=(consume() as Extract<Token,{kind:"operator"}>).value; const right=unary(); if (op === "*" ) left=numeric(left)*numeric(right); else if(op === "/") { if(numeric(right)===0) throw new Error("Division by zero."); left=numeric(left)/numeric(right); } else if(op === "%" || op === "MOD") { if(numeric(right)===0) throw new Error("Division by zero."); left=numeric(left)%numeric(right); } else { if(numeric(right)===0) throw new Error("Division by zero."); left=Math.trunc(numeric(left)/numeric(right)); } } return left; };
  const additive = () => { let left=multiplicative(); while(peek().kind === "operator" && ["+","-"].includes((peek() as Extract<Token,{kind:"operator"}>).value)) { const op=(consume() as Extract<Token,{kind:"operator"}>).value; const right=multiplicative(); if(op === "+" && (typeof left === "string" || typeof right === "string")) left=String(left)+String(right); else left=op === "+" ? numeric(left)+numeric(right) : numeric(left)-numeric(right); } return left; };
  const comparison = () => { let left=additive(); while(peek().kind === "operator" && ["<",">","<=",">=","=","==","!="].includes((peek() as Extract<Token,{kind:"operator"}>).value)) { const op=(consume() as Extract<Token,{kind:"operator"}>).value; const right=additive(); if(op === "=") left=equal(left,right); else if(op === "==") left=equal(left,right); else if(op === "!=") left=!equal(left,right); else if(op === "<") left=numeric(left)<numeric(right); else if(op === ">") left=numeric(left)>numeric(right); else if(op === "<=") left=numeric(left)<=numeric(right); else left=numeric(left)>=numeric(right); } return left; };
  const andExpr = () => { let left=comparison(); while(peek().kind === "operator" && (peek() as Extract<Token,{kind:"operator"}>).value === "AND") { consume(); left=truthy(left) && truthy(comparison()); } return left; };
  const orExpr = () => { let left=andExpr(); while(peek().kind === "operator" && (peek() as Extract<Token,{kind:"operator"}>).value === "OR") { consume(); left=truthy(left) || truthy(andExpr()); } return left; };
  const result=orExpr(); if(peek().kind !== "eof") throw new Error("Unexpected tokens after expression."); return result;
}
