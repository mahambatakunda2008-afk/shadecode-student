import type { ShadeExpression, ShadeProgram, ShadeStatement } from "./types";

export type ShadeSymbolKind = "variable" | "function";

export type ShadeSymbol = {
  name: string;
  kind: ShadeSymbolKind;
  line: number;
  params?: string[];
};

export type ShadeSemanticModel = {
  version: "0.1";
  symbols: ShadeSymbol[];
  concepts: string[];
  dependencies: string[];
  capabilities: string[];
  statementCount: number;
  expressionCount: number;
  controlFlow: { sequence: number; selection: number; iteration: number; functions: number };
  outputs: number;
  inputs: number;
  diagnostics: { severity: "error" | "warning"; message: string; line: number }[];
};

export function analyzeShade(program: ShadeProgram): ShadeSemanticModel {
  const symbols: ShadeSymbol[] = [];
  const concepts = new Set<string>();
  const dependencies = new Set<string>();
  const capabilities = new Set<string>();
  const diagnostics: ShadeSemanticModel["diagnostics"] = [];
  let statementCount = 0;
  let expressionCount = 0;
  let outputs = 0;
  let inputs = 0;
  const controlFlow = { sequence: 0, selection: 0, iteration: 0, functions: 0 };

  const visitExpression = (expression: ShadeExpression) => {
    expressionCount += 1;
    if (expression.type === "call") {
      dependencies.add(expression.name);
      if (expression.name === "read_file") capabilities.add("device.files");
      if (expression.name === "http") capabilities.add("network.internet");
      if (expression.name === "camera") capabilities.add("device.camera");
      if (expression.name === "microphone") capabilities.add("device.microphone");
      expression.args.forEach(visitExpression);
    } else if (expression.type === "array") expression.elements.forEach(visitExpression);
    else if (expression.type === "binary") {
      visitExpression(expression.left);
      visitExpression(expression.right);
    }
  };

  const visit = (statement: ShadeStatement, depth: number) => {
    statementCount += 1;
    if (depth === 0) controlFlow.sequence += 1;
    switch (statement.type) {
      case "assignment":
        concepts.add("variables");
        symbols.push({ name: statement.name, kind: "variable", line: statement.line });
        visitExpression(statement.expression);
        break;
      case "show":
        outputs += 1;
        concepts.add("input-output");
        capabilities.add("console.output");
        visitExpression(statement.expression);
        break;
      case "input":
        inputs += 1;
        concepts.add("input-output");
        capabilities.add("console.input");
        if (statement.prompt) visitExpression(statement.prompt);
        break;
      case "if":
        concepts.add("selection");
        controlFlow.selection += 1;
        visitExpression(statement.condition);
        statement.thenBody.forEach((child) => visit(child, depth + 1));
        statement.elseBody.forEach((child) => visit(child, depth + 1));
        break;
      case "while":
      case "for":
        concepts.add("iteration");
        controlFlow.iteration += 1;
        if (statement.type === "while") visitExpression(statement.condition);
        else visitExpression(statement.iterable);
        statement.body.forEach((child) => visit(child, depth + 1));
        break;
      case "function":
        concepts.add("functions");
        controlFlow.functions += 1;
        symbols.push({ name: statement.name, kind: "function", line: statement.line, params: statement.params });
        statement.body.forEach((child) => visit(child, depth + 1));
        break;
      case "return":
        concepts.add("functions");
        if (statement.expression) visitExpression(statement.expression);
        break;
      case "expression":
        visitExpression(statement.expression);
        break;
    }
  };

  program.body.forEach((statement) => visit(statement, 0));

  const names = new Set<string>();
  for (const symbol of symbols) {
    if (names.has(symbol.name)) diagnostics.push({ severity: "warning", message: `Symbol '${symbol.name}' is declared more than once.`, line: symbol.line });
    names.add(symbol.name);
  }

  if (program.body.length === 0) diagnostics.push({ severity: "warning", message: "The Shade program is empty.", line: 1 });

  return {
    version: "0.1",
    symbols,
    concepts: [...concepts].sort(),
    dependencies: [...dependencies].sort(),
    capabilities: [...capabilities].sort(),
    statementCount,
    expressionCount,
    controlFlow,
    outputs,
    inputs,
    diagnostics,
  };
}
