import { describe, expect, it } from "vitest";
import { ensureRequiredDiagram, hasRequiredLessonStructure, lessonQualityFailures, needsFormulaBlock, normalizeLessonBlockType, requiredSectionTypes, MIN_SECTION_BLOCKS } from "./lessonQuality";

/**
 * Simulates a model that follows the per-section contract exactly, for every plan size the generator
 * can produce, and proves the assembled lesson clears BOTH the client gate and the server structure
 * contract. Each production failure so far (summary, continuation, examples, checkpoints, block caps)
 * was a mismatch between these layers that cost one deploy to find.
 */
const body = (topic: string, type: string, i: number) => {
  const section = ["opening", "foundation", "mechanism", "application", "synthesis", "extension", "review"][Math.floor(i / 10)] ?? "review";
  const marker = (value: number) => { let n = value + 1, out = ""; while (n > 0) { n -= 1; out = String.fromCharCode(97 + (n % 26)) + out; n = Math.floor(n / 26); } return "detail" + out; };
  const uniqueDetails = Array.from({ length: 10 }, (_, offset) => marker(i * 10 + offset)).join(" ");
  return `${topic}: ${type} block ${i} in the ${section} section. This explains why pressure, volume and temperature of a gas are linked, because particles collide with the walls more often when the gas is compressed or heated. The ${section} section uses a distinct example and reasoning students can follow step by step. ${uniqueDetails}.\nKey idea: particles collide with the walls more often when the gas is compressed or heated.\nUse this to predict what happens next.`;
};

function simulateSection(subject: string, topic: string, index: number, count: number) {
  const types = [...requiredSectionTypes(index, count, { formula: needsFormulaBlock(subject, topic, topic) })];
  while (types.length < MIN_SECTION_BLOCKS) types.push("concept");
  return types.map((type, j) => ({ type, title: `${topic} ${type} ${index}.${j}`, content: body(topic, type, index * 10 + j) }));
}

const cases = [
  ["Physics", "Gas laws"], ["Physics", "Electric fields"], ["Mathematics", "Quadratic equations"],
  ["Mathematics", "Trigonometry"], ["Chemistry", "Rates of reaction"], ["Biology", "Photosynthesis"],
] as const;

describe.each(cases.flatMap(([subject, topic]) => [4, 5, 6, 7].map((count) => ({ subject, topic, count }))))(
  "$subject / $topic as a $count-section lesson",
  ({ subject, topic, count }) => {
    // The client assembly step adds the topic's built-in diagram when the model omits it.
    const blocks = ensureRequiredDiagram(Array.from({ length: count }, (_, i) => simulateSection(subject, topic, i, count)).flat(), { subject, topic });
    const request = { intent: "teach", subject, topic, prompt: topic, requestedParts: [], broadTopic: count >= 6, depth: "deep" } as never;

    it("clears the client quality gate", () => {
      expect(lessonQualityFailures({ title: topic, blocks }, request).failures).toEqual([]);
    });

    it("clears the server structure contract and the 36-block ceiling", () => {
      expect(hasRequiredLessonStructure(new Set(blocks.map((b) => normalizeLessonBlockType(b.type))))).toBe(true);
      expect(blocks.length).toBeLessThanOrEqual(36);
      expect(blocks.length).toBeGreaterThanOrEqual(14);
    });
  },
);
