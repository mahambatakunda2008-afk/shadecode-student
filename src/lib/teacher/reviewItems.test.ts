import { describe, expect, it } from "vitest";
import { lessonBody, lessonItem, lessonReviewId, parseLessonReviewId, questionItems, REVIEW_GROUPS } from "./reviewItems";

const ID = "123e4567-e89b-12d3-a456-426614174000";
const row = { id: ID, title: "Photosynthesis", topic: "Plants", subject: "Biology", blocks: [{ type: "text", title: "Overview", content: "Plants make food." }] };

describe("teacher review items", () => {
  it("covers every question bank plus lessons", () => {
    expect(REVIEW_GROUPS.map((g) => g.id)).toContain("lesson");
    expect(new Set(questionItems().map((q) => q.group)).size).toBe(REVIEW_GROUPS.length - 1);
  });

  it("round-trips lesson ids and rejects other ids", () => {
    expect(parseLessonReviewId(lessonReviewId(row))).toBe(ID);
    expect(parseLessonReviewId("biology-abc123")).toBeNull();
    expect(parseLessonReviewId("lesson-not-a-uuid-abc")).toBeNull();
  });

  it("changes the lesson id when the content changes, so old reviews go stale", () => {
    const edited = { ...row, blocks: [{ type: "text", title: "Overview", content: "Plants make food from light." }] };
    expect(lessonReviewId(edited)).not.toBe(lessonReviewId(row));
    expect(lessonReviewId({ ...row })).toBe(lessonReviewId(row));
  });

  it("flattens blocks to readable text and shows media captions", () => {
    const body = lessonBody([...row.blocks, { type: "diagram", alt: "Leaf cross-section" }, null, "junk"]);
    expect(body).toContain("OVERVIEW");
    expect(body).toContain("Plants make food.");
    expect(body).toContain("[diagram: Leaf cross-section]");
    expect(lessonBody("not blocks")).toBe("");
  });

  it("builds a lesson item with safe fallbacks", () => {
    expect(lessonItem({ ...row, title: null, topic: null, subject: null }).title).toBe("Untitled lesson");
    expect(lessonItem(row).topic).toBe("Biology · Plants");
  });
});
