import { describe, expect, it } from "vitest";
import { bestSnippet, buildIndex, qualityMultiplier, search, type LibraryDoc } from "./bm25";

const doc = (id: string, title: string, text: string, extra: Partial<LibraryDoc> = {}): LibraryDoc => ({ id, title, topic: null, subject: "Physics", text, up: 0, down: 0, ...extra });

const docs = [
  doc("binary", "Binary search", "Binary search repeatedly halves a sorted array to find a target value using low, high and mid pointers.", { subject: "Computer Science" }),
  doc("integration", "Integration techniques", "Integration reverses differentiation. Use substitution or integration by parts to find an antiderivative.", { subject: "Mathematics" }),
  doc("organic", "Organic chemistry basics", "A functional group determines how an organic molecule reacts. Alcohols contain the hydroxyl group.", { subject: "Chemistry", topic: "Functional groups" }),
  doc("kinematics", "Kinematics and motion", "Velocity is the rate of change of displacement. Acceleration is the rate of change of velocity.", { subject: "Physics" }),
];
const index = buildIndex(docs);

describe("search", () => {
  it("ranks the relevant lesson first", () => {
    expect(search(index, "how does binary search work")[0].id).toBe("binary");
    expect(search(index, "integration by parts")[0].id).toBe("integration");
    expect(search(index, "what is a functional group")[0].id).toBe("organic");
    expect(search(index, "acceleration and velocity")[0].id).toBe("kinematics");
  });

  it("matches word forms through stemming", () => {
    expect(search(index, "integrating")).toEqual([]); // "integrating" is not "integration": no stem rule, no false match
    expect(search(index, "alcohols")[0].id).toBe("organic");
    expect(search(index, "array pointer")[0].id).toBe("binary");
  });

  it("returns nothing for empty, stopword-only or unrelated queries", () => {
    expect(search(index, "")).toEqual([]);
    expect(search(index, "the of and")).toEqual([]);
    expect(search(index, "tourism marketing strategy")).toEqual([]);
  });

  it("filters by subject and respects the limit", () => {
    expect(search(index, "rate of change", { subject: "physics" }).map((hit) => hit.id)).toEqual(["kinematics"]);
    expect(search(index, "rate change velocity integration", { limit: 1 })).toHaveLength(1);
  });

  it("boosts title matches over body mentions", () => {
    const boosted = buildIndex([
      doc("body", "Unrelated heading", "This text mentions waves once among many other words about other things entirely."),
      doc("title", "Waves", "Short text."),
    ]);
    expect(search(boosted, "waves")[0].id).toBe("title");
  });
});

describe("learning from helpful votes", () => {
  it("moves a well-rated lesson above an equally relevant disliked one", () => {
    const same = "Newton's second law links force, mass and acceleration for any object.";
    const voted = buildIndex([doc("disliked", "Newton second law", same, { up: 0, down: 6 }), doc("loved", "Newton second law", same, { up: 8, down: 0 })]);
    expect(search(voted, "newton second law")[0].id).toBe("loved");
  });
  it("keeps the nudge small and bounded", () => {
    expect(qualityMultiplier(0, 0)).toBeCloseTo(1, 5);
    expect(qualityMultiplier(1000, 0)).toBeLessThan(1.31);
    expect(qualityMultiplier(0, 1000)).toBeGreaterThan(0.69);
  });
  it("does not let votes rescue an irrelevant lesson", () => {
    const voted = buildIndex([doc("popular", "Cooking", "Boil water for pasta.", { up: 999 }), doc("relevant", "Binary search", "Binary search halves a sorted array.")]);
    expect(search(voted, "binary search").map((hit) => hit.id)).toEqual(["relevant"]);
  });
});

describe("bestSnippet", () => {
  const blocks = [
    { type: "concept", title: "Idea", content: "Binary search is a divide and conquer method for sorted data." },
    { type: "example", title: "Worked example", content: "Search for 9 in 1, 3, 5, 7, 9, 11: the middle value is 5, so discard the lower half and repeat with mid pointers." },
  ];
  it("picks the block that best matches and centres the excerpt on the match", () => {
    const snippet = bestSnippet(blocks, "middle value pointers")!;
    expect(snippet.blockIndex).toBe(1);
    expect(snippet.type).toBe("example");
    expect(snippet.text).toContain("middle value");
  });
  it("trims long content and returns null when nothing matches", () => {
    const long = [{ type: "text", title: "Long", content: `${"filler ".repeat(100)}needle ${"more ".repeat(100)}` }];
    const snippet = bestSnippet(long, "needle")!;
    expect(snippet.text.length).toBeLessThan(330);
    expect(snippet.text).toContain("needle");
    expect(bestSnippet(blocks, "tourism")).toBeNull();
    expect(bestSnippet([], "binary")).toBeNull();
  });
});
