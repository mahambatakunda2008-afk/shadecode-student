import type { ShadeBinaryOperator, ShadeDiagnostic, ShadeExpression, ShadeProgram, ShadeStatement, ShadeToken } from "./types";
import { lexShade } from "./lexer";

export function parseShade(source: string): { program: ShadeProgram; diagnostics: ShadeDiagnostic[] } {
  const lexed = lexShade(source);
  const parser = new Parser(lexed.tokens);
  return { program: parser.parseProgram(), diagnostics: [...lexed.diagnostics, ...parser.diagnostics] };
}

class Parser {
  private index = 0;
  readonly diagnostics: ShadeDiagnostic[] = [];
  constructor(private readonly tokens: ShadeToken[]) {}
  private current() { return this.tokens[this.index]; }
  private at(value: string) { return this.current()?.value === value; }
  private advance() { const token = this.current(); this.index += 1; return token; }
  private skipLines() { while (this.at("\n")) this.advance(); }
  private expect(value: string, message = `Expected '${value}'.`) {
    if (this.at(value)) return this.advance();
    const t = this.current(); this.diagnostics.push({ severity: "error", message, line: t?.line ?? 1, column: t?.column ?? 1 });
    return undefined;
  }
  parseProgram(): ShadeProgram {
    const body: ShadeStatement[] = [];
    this.skipLines();
    while (this.current()?.kind !== "eof") {
      const statement = this.parseStatement();
      if (statement) body.push(statement);
      if (this.current()?.kind !== "eof" && !this.at("\n")) {
        const t = this.current();
        this.diagnostics.push({ severity: "error", message: "Expected a new line between statements.", line: t.line, column: t.column });
        while (this.current()?.kind !== "eof" && !this.at("\n")) this.advance();
      }
      this.skipLines();
    }
    return { type: "program", body };
  }
  private parseStatement(): ShadeStatement | undefined {
    const t = this.current(); if (!t) return undefined;
    if (this.at("show")) { this.advance(); return { type: "show", expression: this.parseExpression(), line: t.line }; }
    if (this.at("input")) { this.advance(); const name = this.expectIdentifier("Expected a variable name after input."); let prompt: ShadeExpression | undefined; if (this.at("(")) { this.advance(); prompt = this.parseExpression(); this.expect(")"); } return name ? { type: "input", name, prompt, line: t.line } : undefined; }
    if (this.at("if")) return this.parseIf();
    if (this.at("while")) return this.parseWhile();
    if (this.at("for")) return this.parseFor();
    if (this.at("function")) return this.parseFunction();
    if (this.at("return")) { this.advance(); const expression = this.at("\n") || this.current()?.kind === "eof" ? undefined : this.parseExpression(); return { type: "return", expression, line: t.line }; }
    if (t.kind === "identifier" && this.tokens[this.index + 1]?.value === "=") { const name = this.advance().value; this.advance(); return { type: "assignment", name, expression: this.parseExpression(), line: t.line }; }
    return { type: "expression", expression: this.parseExpression(), line: t.line };
  }
  private parseIf(): ShadeStatement { const t = this.advance(); const condition = this.parseExpression(); this.expect("\n", "Expected a new line after the if condition."); const thenBody = this.parseBlock(["else"], t.column); this.skipLines(); let elseBody: ShadeStatement[] = []; if (this.at("else")) { this.advance(); this.expect("\n", "Expected a new line after else."); elseBody = this.parseBlock([], t.column); } return { type: "if", condition, thenBody, elseBody, line: t.line }; }
  private parseWhile(): ShadeStatement { const t = this.advance(); const condition = this.parseExpression(); this.expect("\n", "Expected a new line after the while condition."); return { type: "while", condition, body: this.parseBlock([], t.column), line: t.line }; }
  private parseFor(): ShadeStatement { const t = this.advance(); const name = this.expectIdentifier("Expected a loop variable after for."); this.expect("in", "Expected 'in' in a for loop."); const iterable = this.parseExpression(); this.expect("\n", "Expected a new line after the for loop."); return { type: "for", name: name ?? "item", iterable, body: this.parseBlock([], t.column), line: t.line }; }
  private parseFunction(): ShadeStatement { const t = this.advance(); const name = this.expectIdentifier("Expected a function name."); this.expect("("); const params: string[] = []; while (!this.at(")") && this.current()?.kind !== "eof") { const param = this.expectIdentifier("Expected a parameter name."); if (param) params.push(param); if (!this.at(",")) break; this.advance(); } this.expect(")"); this.expect("\n", "Expected a new line after the function declaration."); const body = this.parseBlock(["end"], t.column); this.skipLines(); if (this.at("end")) this.advance(); return { type: "function", name: name ?? "anonymous", params, body, line: t.line }; }
  private parseBlock(stopKeywords: string[], parentColumn: number): ShadeStatement[] {
    const body: ShadeStatement[] = [];
    this.skipLines();
    while (this.current()?.kind !== "eof") {
      if (this.at("\n")) {
        const next = this.tokens[this.index + 1];
        if (!next || next.kind === "eof" || next.column <= parentColumn || stopKeywords.includes(next.value)) break;
        this.skipLines();
        continue;
      }
      const token = this.current();
      if (!token || stopKeywords.includes(token.value) || token.column <= parentColumn) break;
      const statement = this.parseStatement();
      if (statement) body.push(statement);
      if (this.current()?.kind !== "eof" && !this.at("\n")) {
        const t = this.current();
        this.diagnostics.push({ severity: "error", message: "Expected a new line between statements.", line: t.line, column: t.column });
        while (this.current()?.kind !== "eof" && !this.at("\n")) this.advance();
      }
      if (this.at("\n")) {
        const next = this.tokens[this.index + 1];
        if (!next || next.kind === "eof" || next.column <= parentColumn || stopKeywords.includes(next.value)) {
          break;
        }
        this.skipLines();
      }
    }
    return body;
  }
  private parseExpression() { return this.parseBinary(0); }
  private precedence(operator: string) { return ({ or: 1, and: 2, "==": 3, "!=": 3, "<": 4, "<=": 4, ">": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 } as Record<string, number>)[operator] ?? -1; }
  private parseBinary(min: number): ShadeExpression { let left = this.parsePrimary(); while (this.current()?.kind === "operator" || this.current()?.value === "and" || this.current()?.value === "or") { const op = this.current().value; const prec = this.precedence(op); if (prec < min) break; const operatorToken = this.advance(); const right = this.parseBinary(prec + 1); left = { type: "binary", operator: op as ShadeBinaryOperator, left, right, location: { line: operatorToken?.line ?? left.location?.line ?? 1, column: operatorToken?.column } }; } return left; }
  private parsePrimary(): ShadeExpression {
    const t = this.current(); if (!t) return { type: "literal", value: null };
    const location = { line: t.line, column: t.column };
    if (t.kind === "number") { this.advance(); return { type: "literal", value: Number(t.value), location }; }
    if (t.kind === "string") { this.advance(); return { type: "literal", value: t.value, location }; }
    if (t.value === "true" || t.value === "false") { this.advance(); return { type: "literal", value: t.value === "true", location }; }
    if (t.value === "none") { this.advance(); return { type: "literal", value: null, location }; }
    if (t.kind === "lbracket") { this.advance(); const elements: ShadeExpression[] = []; while (!this.at("]") && this.current()?.kind !== "eof") { elements.push(this.parseExpression()); if (!this.at(",")) break; this.advance(); } this.expect("]"); return { type: "array", elements, location }; }
    if (t.kind === "identifier" || t.kind === "keyword") { const name = this.advance().value; if (this.at("(")) { this.advance(); const args: ShadeExpression[] = []; while (!this.at(")") && this.current()?.kind !== "eof") { args.push(this.parseExpression()); if (!this.at(",")) break; this.advance(); } this.expect(")"); return { type: "call", name, args, location }; } return { type: "variable", name, location }; }
    if (this.at("(")) { this.advance(); const expression = this.parseExpression(); this.expect(")"); return expression; }
    this.diagnostics.push({ severity: "error", message: `Unexpected token '${t.value}'.`, line: t.line, column: t.column }); this.advance(); return { type: "literal", value: null, location };
  }
  private expectIdentifier(message: string) { const t = this.current(); if (t?.kind === "identifier") { this.advance(); return t.value; } this.diagnostics.push({ severity: "error", message, line: t?.line ?? 1, column: t?.column ?? 1 }); return undefined; }
}
