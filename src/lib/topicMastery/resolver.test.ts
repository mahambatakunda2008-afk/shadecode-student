import { beforeEach, describe, expect, it } from "vitest";
import { buildTopicIndex, resolveTopic, subjectIdsFor, type CurriculumTopicUnit } from "./resolver";
import { resetCurriculumLinkCache, resolveCurriculumLink } from "./curriculumLink";

const unit = (syllabusId: string, subjectId: string, topicKey: string, title: string): CurriculumTopicUnit => ({ syllabusId, subjectId, topicKey, title });

const UNITS = [
  unit("cambridge-9701", "chemistry", "1.1", "Particles in the atom and atomic radius"),
  unit("cambridge-9701", "chemistry", "1.2", "Isotopes"),
  unit("cambridge-9702", "physics", "1.1", "Physical quantities"),
  unit("cambridge-9702", "physics", "1.2", "SI units"),
  unit("cambridge-9702", "physics", "5.1", "Work and energy"),
  unit("cambridge-9702", "physics", "5.2", "Power"),
  unit("cambridge-9709", "mathematics", "1.1", "Quadratics"),
  unit("cambridge-9709", "mathematics", "1.2", "Functions"),
  unit("cambridge-0478", "computer-science", "1.1", "Data representation"),
  unit("cambridge-9618", "computer-science", "1.1", "Data representation"),
];
const index = buildTopicIndex(UNITS);

describe("subjectIdsFor", () => {
  it("maps common free-text subjects", () => {
    expect(subjectIdsFor("A Level Physics")).toEqual(["physics"]);
    expect(subjectIdsFor("Maths")).toEqual(["mathematics"]);
    expect(subjectIdsFor("Paper Study")).toEqual([]);
  });
});

describe("resolveTopic", () => {
  it("resolves an exact title regardless of case, plurals and punctuation", () => {
    const result = resolveTopic("  isotopes. ", "Chemistry", index);
    expect(result).toMatchObject({ status: "resolved", confidence: "exact", unit: { topicKey: "1.2", syllabusId: "cambridge-9701" } });
    expect(resolveTopic("Quadratic", "Mathematics", index)).toMatchObject({ status: "resolved", unit: { topicKey: "1.1" } });
  });

  it("resolves when the curriculum title is contained in a more specific label", () => {
    const result = resolveTopic("Work and energy conservation in collisions", "Physics", index);
    expect(result).toMatchObject({ status: "resolved", confidence: "contained", unit: { topicKey: "5.1" } });
  });

  it("does not resolve on a single shared word", () => {
    expect(resolveTopic("Energy", "Physics", index).status).toBe("none");
    expect(resolveTopic("Newton's second law", "Physics", index).status).toBe("none");
  });

  it("returns none for unknown subjects so nothing is guessed", () => {
    expect(resolveTopic("Isotopes", "Paper Study", index).status).toBe("none");
    expect(resolveTopic("Isotopes", "Physics", index).status).toBe("none");
  });

  it("flags the same title in several syllabi as ambiguous", () => {
    const result = resolveTopic("Data representation", "Computer Science", index);
    expect(result.status).toBe("ambiguous");
  });
});

describe("resolveCurriculumLink", () => {
  beforeEach(() => resetCurriculumLinkCache());

  const rows = UNITS.map((u) => ({ syllabus_id: u.syllabusId, subject_id: u.subjectId, topic_key: u.topicKey, title: u.title }));
  const client = (result: { data: unknown[] | null; error: unknown }) => ({
    from: () => ({ select: () => Promise.resolve(result) }),
  });

  it("returns the columns to merge into the upsert when resolved", async () => {
    await expect(resolveCurriculumLink(client({ data: rows, error: null }), "Chemistry", "Isotopes")).resolves.toEqual({
      syllabus_id: "cambridge-9701",
      curriculum_topic_key: "1.2",
    });
  });

  it("returns an empty object (never nulls) when unresolved", async () => {
    await expect(resolveCurriculumLink(client({ data: rows, error: null }), "Physics", "Newton's second law")).resolves.toEqual({});
  });

  it("never throws when the lookup fails", async () => {
    await expect(resolveCurriculumLink(client({ data: null, error: new Error("down") }), "Chemistry", "Isotopes")).resolves.toEqual({});
  });
});
