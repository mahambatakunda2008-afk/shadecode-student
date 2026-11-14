import { describe, expect, it } from "vitest";
import { BIOLOGY_CONTROL_COORDINATION_STARTER } from "./biology-control-coordination";
import { buildDeterministicLessonFallback } from "../lessonFallback";

describe("Biology 9700 Topic 15 control and coordination lesson", () => {
  const text = BIOLOGY_CONTROL_COORDINATION_STARTER.blocks.map((block) => block.title + " " + block.content).join("\n");

  it("is substantial and includes diagrams, practice and exam transfer", () => {
    const blocks = BIOLOGY_CONTROL_COORDINATION_STARTER.blocks;
    expect(blocks.length).toBeGreaterThanOrEqual(30);
    expect(blocks[0].type).toBe("objective");
    expect(blocks.at(-1)?.type).toBe("summary");
    expect(blocks.filter((block) => block.type === "diagram").length).toBeGreaterThanOrEqual(7);
    expect(blocks.some((block) => block.type === "practice")).toBe(true);
    expect(blocks.some((block) => block.type === "exam")).toBe(true);
    for (const block of blocks) {
      expect(block.content.trim().length, block.title).toBeGreaterThan(40);
      expect(block.content.length, block.title).toBeLessThanOrEqual(1800);
    }
  });

  it("covers the mammalian and plant control outcomes", () => {
    for (const term of ["endocrine system", "sensory neurone", "motor neurone", "intermediate neurones", "taste bud", "resting potential", "sodium-potassium pump", "depolarisation", "repolarisation", "refractory period", "saltatory conduction", "nodes of Ranvier", "cholinergic synapse", "acetylcholine", "calcium ions", "acetylcholinesterase", "neuromuscular junction", "T-tubules", "sarcoplasmic reticulum", "sarcomere", "troponin", "tropomyosin", "sliding-filament", "Venus flytrap", "trigger hairs", "auxin", "proton pumps", "gibberellin", "barley", "alpha-amylase"]) {
      expect(text.toLowerCase()).toContain(term.toLowerCase());
    }
  });

  it("routes only Biology control topics and prevents subject leakage", () => {
    for (const topic of ["control and coordination", "nervous system", "endocrine system", "sensory neurone", "action potential", "saltatory conduction", "synapse", "neuromuscular junction", "sarcomere", "sliding filament", "Venus flytrap", "auxin", "gibberellin", "barley germination"]) {
      const lesson = buildDeterministicLessonFallback("Cambridge International AS & A Level Biology 9700", topic);
      expect(lesson?.title).toContain("Control and coordination");
    }
    expect(buildDeterministicLessonFallback("Chemistry", "action potential")).toBeNull();
    expect(buildDeterministicLessonFallback("Physics", "synapse")).toBeNull();
  });
});
