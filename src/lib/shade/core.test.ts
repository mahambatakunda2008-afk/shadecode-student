import { describe, expect, it } from "vitest";
import { parseShade, runShade } from "./index";
import { analyzeShade } from "./semantic";
import { createShadeProjectModel } from "./project";
import { buildShadeProjectGraph } from "./graph";
import { lowerShadeToIR } from "./ir";

describe("Shade language core", () => {
  it("parses and executes basic values", () => {
    const result = runShade('name = "Shade"\nshow "Hello " + name');
    expect(result.diagnostics).toEqual([]);
    expect(result.stdout).toEqual(["Hello Shade"]);
  });

  it("executes selection and iteration", () => {
    const result = runShade("total = 0\nfor value in [1, 2, 3]\n    total = total + value\nshow total\nif total == 6\n    show \"passed\"\nelse\n    show \"failed\"");
    expect(result.diagnostics).toEqual([]);
    expect(result.stdout).toEqual(["6", "passed"]);
  });

  it("supports functions and built-in collection helpers", () => {
    const result = runShade("function average(values)\n    return sum(values) / length(values)\nshow average([10, 20, 30])");
    expect(result.diagnostics).toEqual([]);
    expect(result.stdout).toEqual(["20"]);
  });

  it("rejects unknown characters before execution", () => {
    const result = parseShade("value = 10 @ 2");
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes("Unexpected character"))).toBe(true);
  });

  it("stops runaway loops", () => {
    const result = runShade("x = 1\nwhile x > 0\n    show x", { maxSteps: 100 });
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes("limit exceeded"))).toBe(true);
  });

  it("lowers source into semantic, graph, and IR representations", () => {
    const parsed = parseShade(["name = 7", "if name > 3", "    show name", "else", "    show 0"].join("\n"));
    expect(parsed.diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
    const semantic = analyzeShade(parsed.program);
    const project = createShadeProjectModel({ name: "Shade Core Test", entry: "main.shade", semantic, languageVersion: "0.1.0-design-core" });
    const graph = buildShadeProjectGraph(project);
    const ir = lowerShadeToIR(parsed.program);

    expect(semantic.concepts).toEqual(expect.arrayContaining(["variables", "selection", "input-output"]));
    expect(semantic.capabilities).toContain("console.output");
    expect(graph.nodes.some((node) => node.kind === "symbol" && node.label === "name")).toBe(true);
    expect(graph.nodes.some((node) => node.kind === "capability" && node.label === "console.output")).toBe(true);
    expect(ir.instructions.some((instruction) => instruction.op === "jump_if_false")).toBe(true);
    expect(ir.instructions.some((instruction) => instruction.op === "show")).toBe(true);
  });

  it("models required capabilities without granting them", () => {
    const parsed = parseShade('data = read_file("notes.txt")');
    const semantic = analyzeShade(parsed.program);
    const project = createShadeProjectModel({ name: "Capability Test", entry: "main.shade", semantic, languageVersion: "0.1.0-design-core" });
    expect(project.manifest.requirements.capabilities).toContain("device.files");
    expect(project.graph.some((edge) => edge.relation === "requires")).toBe(true);
  });
});
