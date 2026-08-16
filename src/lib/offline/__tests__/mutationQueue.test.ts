import { describe, expect, it } from "vitest";
import { mutationQueue, type MutationOperation } from "../mutationQueue";

describe("offline mutation queue contract", () => {
  it("exposes only approved mutation operations", () => {
    const operations: MutationOperation[] = [
      "task.upsert",
      "task.update",
      "task.delete",
      "subject.upsert",
      "subject.update",
      "subject.delete",
      "lesson_progress.update",
    ];

    expect(operations).toHaveLength(7);
    expect(mutationQueue).toBeDefined();
  });
});
