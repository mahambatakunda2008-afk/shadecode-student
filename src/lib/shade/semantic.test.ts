import { describe, expect, it } from "vitest";
import { analyzeShade, createShadeExecutionPlan, createShadeProjectModel, runShade } from "./index";
import { parseShade } from "./parser";

describe("Shade native vertical slice", () => {
  it("builds semantic, project, capability, and evidence data from executable Shade", () => {
    const source = `numbers = [1, 2, 3]\nshow sum(numbers)`;
    const parsed = runShade(source);
    const semantic = analyzeShade(parseShade(source).program);
    const project = createShadeProjectModel({ name: "demo", entry: "main.shade", semantic, languageVersion: "0.1.0-design-core" });
    const plan = createShadeExecutionPlan(semantic);

    expect(parsed.stdout).toEqual(["6"]);
    expect(semantic.concepts).toContain("variables");
    expect(semantic.dependencies).toContain("sum");
    expect(semantic.capabilities).toContain("console.output");
    expect(project.manifest.format).toBe("shade-project");
    expect(project.graph.some((edge) => edge.relation === "requires" && edge.to === "sum")).toBe(true);
    expect(plan.provider).toBe("shade-interpreter");
    expect(plan.privacy).toBe("local");
  });

  it("detects capabilities from semantic calls without executing them", () => {
    const semantic = analyzeShade(parseShade(`show http("https://example.com")`).program);
    expect(semantic.capabilities).toContain("network.internet");
    expect(createShadeExecutionPlan(semantic).networkRequired).toBe(true);
  });
});
