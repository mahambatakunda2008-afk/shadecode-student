import { describe, expect, it } from "vitest";
import { createCortexPlan, createCortexTask, executeCortexPlan } from "./orchestrator";

describe("Cortex orchestrator", () => {
  it("creates a study workflow with tutoring and verification", () => {
    const task = createCortexTask("Teach me projectile motion, give me a question and check my answer");
    const plan = createCortexPlan(task);

    expect(plan.steps.map((step) => step.agent)).toEqual(["tutor", "verifier"]);
    expect(plan.steps.map((step) => step.capability)).toEqual(["teach", "verify"]);
  });

  it("creates research, build, and verification stages for a build request", () => {
    const task = createCortexTask("Research existing approaches and build a small tool, then test it");
    const plan = createCortexPlan(task);

    expect(plan.steps.map((step) => step.agent)).toEqual(["researcher", "builder", "verifier"]);
  });

  it("blocks an agent outside its declared permission boundary", async () => {
    const task = createCortexTask("build something");
    const plan = createCortexPlan(task);

    await expect(executeCortexPlan(task, plan, {
      builder: ({ step }) => ({ agent: "builder", ok: true, output: step.capability }),
    }, {
      builder: { capabilities: ["research"] },
    })).rejects.toThrow("not permitted");
  });

  it("does not claim verification when no verifier is registered", async () => {
    const task = createCortexTask("build a calculator");
    const plan = createCortexPlan(task);
    const execution = await executeCortexPlan(task, plan, {
      builder: () => ({ agent: "builder", ok: true, output: "calculator" }),
    });

    expect(execution.verified).toBe(false);
    expect(execution.finalOutput).toMatchObject({ status: "completed-without-verification" });
  });

  it("requires verifier success before reporting a verified result", async () => {
    const task = createCortexTask("build and verify a calculator");
    const plan = createCortexPlan(task);
    const execution = await executeCortexPlan(task, plan, {
      builder: () => ({ agent: "builder", ok: true, output: "calculator" }),
      verifier: () => ({ agent: "verifier", ok: true, output: "all checks passed", evidence: ["calculator.test.ts"] }),
    });

    expect(execution.verified).toBe(true);
    expect(execution.finalOutput).toMatchObject({ status: "verified", output: "all checks passed" });
  });
});
