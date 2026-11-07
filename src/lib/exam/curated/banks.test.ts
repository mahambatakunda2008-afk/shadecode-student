import { describe, expect, it } from "vitest";
import { buildCuratedFallbackExam } from "../fallbackExam";
import { isValidGeneratedPaper } from "../paperValidation";
import { BIOLOGY_TOPICS } from "./biology";
import { ENGLISH_TOPICS } from "./english";
import { GEOGRAPHY_TOPICS } from "./geography";
import { HISTORY_TOPICS } from "./history";

const BANKS = [
  { subject: "Biology", topics: BIOLOGY_TOPICS, level: "easy" },
  { subject: "Geography", topics: GEOGRAPHY_TOPICS, level: "easy" },
  { subject: "History", topics: HISTORY_TOPICS, level: "easy" },
  { subject: "English", topics: ENGLISH_TOPICS, level: "easy" },
] as const;

// The paper validator rejects a paper in which two questions share the same text once punctuation and case are ignored.
const normalise = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

describe.each(BANKS)("$subject bank works with the paper validator", ({ subject, topics, level }) => {
  const all = topics.flatMap((entry) => entry.questions);

  it("has no two questions that look identical to the validator", () => {
    const seen = new Map<string, string>();
    for (const q of all) {
      const key = normalise(q.question);
      expect(seen.has(key), `"${q.question}" repeats "${seen.get(key)}"`).toBe(false);
      seen.set(key, q.question);
    }
  });

  it("builds a valid paper every time, at every offered size, for broad and single-topic requests", () => {
    const requests = ["", subject, ...topics.map((entry) => entry.topic)];
    for (let round = 0; round < 40; round++) {
      for (const request of requests) {
        for (const count of [5, 10, 15, 20]) {
          const paper = buildCuratedFallbackExam(subject, request, level, count);
          if (!paper) continue;
          const questions = paper.questions.map((q, i) => ({ ...q, id: i + 1 }));
          expect(isValidGeneratedPaper(questions, questions.length), `${subject} / "${request}" / ${count}`).toBe(true);
        }
      }
    }
  });
});
