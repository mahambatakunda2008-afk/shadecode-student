import { describe, expect, it } from "vitest";
import { parseTutorialReviewId, parseVideoUrl, sanitizeBlocks, tutorialReviewId } from "./tutorial";

const PREFIX = "https://proj.supabase.co/storage/v1/object/public/teacher-media/";

describe("parseVideoUrl", () => {
  it("accepts the common YouTube link shapes and rebuilds the embed URL", () => {
    for (const u of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?t=10",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ]) {
      expect(parseVideoUrl(u)).toEqual({ provider: "youtube", embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
    }
  });

  it("accepts Google Drive file links", () => {
    expect(parseVideoUrl("https://drive.google.com/file/d/1AbCdEfGhIjK_lm-N/view?usp=sharing")?.embedUrl).toBe(
      "https://drive.google.com/file/d/1AbCdEfGhIjK_lm-N/preview",
    );
  });

  it("rejects other hosts, http, bad ids and junk", () => {
    for (const u of ["http://youtu.be/dQw4w9WgXcQ", "https://evil.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/short", "javascript:alert(1)", "not a url", "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ"]) {
      expect(parseVideoUrl(u)).toBeNull();
    }
  });
});

describe("sanitizeBlocks", () => {
  it("keeps valid blocks and drops empty text", () => {
    const r = sanitizeBlocks([{ type: "text", content: " hi " }, { type: "text", content: "" }, { type: "image", url: `${PREFIX}u/a.webp`, alt: "Leaf" }], PREFIX);
    expect(r).toEqual({ ok: true, blocks: [{ type: "text", content: "hi" }, { type: "image", url: `${PREFIX}u/a.webp`, alt: "Leaf" }] });
  });

  it("rejects images that were not uploaded to our bucket", () => {
    expect(sanitizeBlocks([{ type: "image", url: "https://tracker.example/pixel.png", alt: "" }], PREFIX).ok).toBe(false);
  });

  it("ignores a client-supplied embed URL and rebuilds it from the source link", () => {
    const r = sanitizeBlocks([{ type: "video", sourceUrl: "https://youtu.be/dQw4w9WgXcQ", embedUrl: "https://evil.com/x", title: "Intro" }], PREFIX);
    expect(r.ok && r.blocks[0]).toMatchObject({ type: "video", embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
  });

  it("rejects unknown types, bad videos, oversize text and too many blocks", () => {
    expect(sanitizeBlocks([{ type: "script" }], PREFIX).ok).toBe(false);
    expect(sanitizeBlocks([{ type: "video", sourceUrl: "https://vimeo.com/1" }], PREFIX).ok).toBe(false);
    expect(sanitizeBlocks([{ type: "text", content: "x".repeat(5001) }], PREFIX).ok).toBe(false);
    expect(sanitizeBlocks(Array.from({ length: 61 }, () => ({ type: "text", content: "a" })), PREFIX).ok).toBe(false);
    expect(sanitizeBlocks("nope", PREFIX).ok).toBe(false);
  });
});

describe("tutorial review ids", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";
  it("round-trip and go stale when content changes", () => {
    const a = tutorialReviewId({ id, title: "T", blocks: [{ type: "text", content: "a" }] });
    expect(parseTutorialReviewId(a)).toBe(id);
    expect(tutorialReviewId({ id, title: "T", blocks: [{ type: "text", content: "b" }] })).not.toBe(a);
    expect(parseTutorialReviewId("lesson-abc")).toBeNull();
  });
});
