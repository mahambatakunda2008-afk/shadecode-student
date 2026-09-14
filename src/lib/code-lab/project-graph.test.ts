import { describe, expect, it } from "vitest";
import { buildProjectGraph, normalizeProjectPath } from "./project-graph";

describe("project graph", () => {
  it("normalizes workspace paths", () => {
    expect(normalizeProjectPath("src/./lib/../main.js")).toBe("src/main.js");
  });

  it("resolves relative JavaScript dependencies and entrypoints", () => {
    const graph = buildProjectGraph([
      { path: "main.js", content: 'import { greet } from "./utils"; greet("Ada");' },
      { path: "utils.js", content: 'export function greet(name) { return name; }' },
      { path: "unused.js", content: "export const value = 1;" },
    ]);
    expect(graph.edges).toEqual([{ from: "main.js", to: "utils.js", specifier: "./utils" }]);
    expect(graph.nodes.find((node) => node.path === "utils.js")?.dependents).toEqual(["main.js"]);
    expect(graph.entrypoints).toContain("main.js");
    expect(graph.entrypoints).toContain("unused.js");
  });

  it("reports unresolved relative imports", () => {
    const graph = buildProjectGraph([{ path: "main.js", content: 'import "./missing";' }]);
    expect(graph.nodes[0].unresolvedImports).toEqual(["./missing"]);
  });

  it("detects circular workspace dependencies", () => {
    const graph = buildProjectGraph([
      { path: "a.js", content: 'import "./b";' },
      { path: "b.js", content: 'import "./a";' },
    ]);
    expect(graph.cycles).toHaveLength(1);
  });
});
