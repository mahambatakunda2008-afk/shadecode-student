import { describe, expect, it } from "vitest";
import { buildIndex, type LibraryDoc } from "./bm25";
import { recoverLesson } from "./recover";
import type { LibraryRow } from "./store";

const row = (id: string, title: string, subject: string, topic: string | null = null, blocks = 5): LibraryRow => ({
  id, title, topic, subject, difficulty: "medium",
  blocks: Array.from({ length: blocks }, (_, i) => ({ type: "text", title: `Part ${i + 1}`, content: `${title} content part ${i + 1}` })),
  search_text: `${title} ${topic ?? ""} ${title} content`, helpful_up: 0, helpful_down: 0,
});

function library(rows: LibraryRow[]) {
  const docs: LibraryDoc[] = rows.map((r) => ({ id: r.id, title: r.title, topic: r.topic, subject: r.subject, text: r.search_text, up: r.helpful_up, down: r.helpful_down }));
  return { index: buildIndex(docs), rows: new Map(rows.map((r) => [r.id, r])) };
}

const lib = library([
  row("binary", "Binary search", "Computer Science"),
  row("integration", "Integration by parts", "Mathematics"),
  row("organic", "Organic chemistry basics", "Chemistry", "Functional groups"),
  row("thin", "Binary trees", "Computer Science", null, 2),
]);

describe("recoverLesson", () => {
  it("returns the lesson whose title covers the requested topic", () => {
    expect(recoverLesson(lib.index, lib.rows, "Computer Science", "binary search")?.id).toBe("binary");
    expect(recoverLesson(lib.index, lib.rows, "Mathematics", "integration by parts")?.id).toBe("integration");
  });

  it("matches a subject written differently from the lesson's", () => {
    expect(recoverLesson(lib.index, lib.rows, "A Level Mathematics", "integration by parts")?.id).toBe("integration");
    expect(recoverLesson(lib.index, lib.rows, "computer science", "binary search")?.id).toBe("binary");
  });

  it("uses the lesson topic as well as its title", () => {
    expect(recoverLesson(lib.index, lib.rows, "Chemistry", "functional groups")?.id).toBe("organic");
  });

  it("refuses a lesson that only mentions the request in passing", () => {
    expect(recoverLesson(lib.index, lib.rows, "Computer Science", "binary search tree traversal algorithms")).toBeNull();
    expect(recoverLesson(lib.index, lib.rows, "Mathematics", "differentiation of trigonometric functions")).toBeNull();
  });

  it("never crosses subjects, and refuses thin lessons and empty requests", () => {
    expect(recoverLesson(lib.index, lib.rows, "Chemistry", "binary search")).toBeNull();
    expect(recoverLesson(lib.index, lib.rows, "Computer Science", "binary trees")).toBeNull(); // only 2 blocks
    expect(recoverLesson(lib.index, lib.rows, "Physics", "")).toBeNull();
    expect(recoverLesson(buildIndex([]), new Map(), "Physics", "waves")).toBeNull();
  });
});
