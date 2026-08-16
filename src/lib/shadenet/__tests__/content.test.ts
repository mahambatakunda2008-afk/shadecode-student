import { describe, expect, it } from "vitest";
import { contentHash } from "../content";

const metadata = { type: "lesson" as const, title: "Newton's laws", subject: "Physics", createdAt: "2026-08-16T00:00:00.000Z" };

describe("ShadeNet content addressing", () => {
  it("produces the same hash regardless of object key order", async () => {
    const a = await contentHash({ metadata, content: { title: "Newton", body: "F=ma" } });
    const b = await contentHash({ metadata, content: { body: "F=ma", title: "Newton" } });
    expect(a).toBe(b);
  });

  it("changes the hash when content changes", async () => {
    const a = await contentHash({ metadata, content: { body: "F=ma" } });
    const b = await contentHash({ metadata, content: { body: "F=mv" } });
    expect(a).not.toBe(b);
  });
});
