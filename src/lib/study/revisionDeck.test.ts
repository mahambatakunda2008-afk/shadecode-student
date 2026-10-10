import { describe, expect, it } from "vitest";
import { buildRevisionDeck, isRevisionRating, promptFromOutcome, RATING_EVIDENCE, type OutcomeRow } from "./revisionDeck";

const row = (key: string, topic: string, content: string, level = "as_level"): OutcomeRow => ({
  knowledge_key: `outcome|${topic}|${key.split(".").pop()}`,
  topic_key: topic,
  title: `Quadratics: outcome ${key.split(".").pop()}`,
  content,
  objective_keys: [key],
  level,
});

describe("promptFromOutcome", () => {
  it("turns weak lead verbs into answerable prompts", () => {
    expect(promptFromOutcome("Understand the idea of a function.")).toBe("Explain the idea of a function.");
    expect(promptFromOutcome("Understand that a gradient is a rate of change")).toBe("Show you understand that a gradient is a rate of change.");
    expect(promptFromOutcome("Know the formula for the sum of an arithmetic series")).toBe("Recall: the formula for the sum of an arithmetic series.");
    expect(promptFromOutcome("Use the factor theorem")).toBe("Show how you would use the factor theorem.");
    expect(promptFromOutcome("Recognise a geometric progression")).toBe("Show how to recognise a geometric progression.");
  });
  it("keeps command-word outcomes as they are", () => {
    expect(promptFromOutcome("Describe the structure of an atom")).toBe("Describe the structure of an atom.");
    expect(promptFromOutcome("  Calculate the pH of a strong acid;  ")).toBe("Calculate the pH of a strong acid.");
  });
  it("never produces an empty or broken prompt", () => {
    expect(promptFromOutcome("Understand")).toBe("Understand.");
    expect(promptFromOutcome("")).toBe(".");
  });
});

describe("buildRevisionDeck", () => {
  const rows = [
    row("1.2.2", "1.2", "Describe the discriminant"),
    row("1.1.1", "1.1", "Understand the idea of a function"),
    row("1.1.10", "1.1", "Use the factor theorem"),
    row("1.1.2", "1.1", "Know the quadratic formula"),
    { ...row("1.3.1", "1.3", "   "), content: "   " },
  ];

  it("orders by outcome number, drops empty outcomes and filters by topic", () => {
    expect(buildRevisionDeck(rows).map((c) => c.outcomeKey)).toEqual(["1.1.1", "1.1.2", "1.1.10", "1.2.2"]);
    expect(buildRevisionDeck(rows, { topicKey: "1.1" }).map((c) => c.outcomeKey)).toEqual(["1.1.1", "1.1.2", "1.1.10"]);
  });

  it("builds cards that point back to the official outcome", () => {
    const card = buildRevisionDeck(rows, { topicKey: "1.1" })[0];
    expect(card.topicTitle).toBe("Quadratics");
    expect(card.front).toBe("Explain the idea of a function.");
    expect(card.back).toContain("Official outcome 1.1.1: Understand the idea of a function.");
    expect(card.level).toBe("as_level");
  });

  it("caps the deck and samples deterministically when a seed is given", () => {
    const many = Array.from({ length: 30 }, (_, i) => row(`2.1.${i + 1}`, "2.1", `Describe thing ${i + 1}`));
    expect(buildRevisionDeck(many, { limit: 10 })).toHaveLength(10);
    const a = buildRevisionDeck(many, { limit: 10, seed: 4 }).map((c) => c.id);
    expect(a).toEqual(buildRevisionDeck(many, { limit: 10, seed: 4 }).map((c) => c.id));
    expect(a).not.toEqual(buildRevisionDeck(many, { limit: 10, seed: 5 }).map((c) => c.id));
    expect(new Set(a).size).toBe(10);
  });
});

describe("ratings", () => {
  it("accepts only known ratings and keeps self-assessment evidence conservative", () => {
    expect(isRevisionRating("got_it")).toBe(true);
    expect(isRevisionRating("perfect")).toBe(false);
    expect(RATING_EVIDENCE.got_it.evidence).toBeLessThan(100);
    expect(RATING_EVIDENCE.not_yet.evidence).toBeGreaterThan(0);
  });
});
