export type ShadePrimitive = "number" | "text" | "boolean" | "none";

export type ShadeValue = number | string | boolean | null | ShadeValue[];

export type ShadeTokenKind =
  | "number" | "string" | "identifier" | "keyword" | "operator"
  | "newline" | "lparen" | "rparen" | "lbracket" | "rbracket"
  | "comma" | "colon" | "eof";

export type ShadeToken = {
  kind: ShadeTokenKind;
  value: string;
  line: number;
  column: number;
};

export type ShadeBinaryOperator = "+" | "-" | "*" | "/" | "%" | "==" | "!=" | "<" | "<=" | ">" | ">=" | "and" | "or";

export type ShadeExpression =
  | { type: "literal"; value: ShadeValue }
  | { type: "variable"; name: string }
  | { type: "array"; elements: ShadeExpression[] }
  | { type: "binary"; operator: ShadeBinaryOperator; left: ShadeExpression; right: ShadeExpression }
  | { type: "call"; name: string; args: ShadeExpression[] };

export type ShadeStatement =
  | { type: "assignment"; name: string; expression: ShadeExpression; line: number }
  | { type: "show"; expression: ShadeExpression; line: number }
  | { type: "input"; name: string; prompt?: ShadeExpression; line: number }
  | { type: "if"; condition: ShadeExpression; thenBody: ShadeStatement[]; elseBody: ShadeStatement[]; line: number }
  | { type: "while"; condition: ShadeExpression; body: ShadeStatement[]; line: number }
  | { type: "for"; name: string; iterable: ShadeExpression; body: ShadeStatement[]; line: number }
  | { type: "function"; name: string; params: string[]; body: ShadeStatement[]; line: number }
  | { type: "return"; expression?: ShadeExpression; line: number }
  | { type: "expression"; expression: ShadeExpression; line: number };

export type ShadeProgram = { type: "program"; body: ShadeStatement[] };

export type ShadeDiagnostic = {
  severity: "error" | "warning" | "info";
  message: string;
  line: number;
  column?: number;
};

export type ShadeExecutionResult = {
  stdout: string[];
  diagnostics: ShadeDiagnostic[];
  variables: Record<string, ShadeValue>;
  steps: number;
  durationMs: number;
};
