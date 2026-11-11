import { describe, expect, it } from "vitest";
import { parseDriveId, parseYouTubeId, validateTutorialBlocks } from "./tutorials";

const author = "123e4567-e89b-42d3-a456-426614174000";
const blockId = "123e4567-e89b-42d3-a456-426614174001";

describe("tutorial media link validation", () => {
  it("accepts supported YouTube URL forms and extracts only the video ID", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=abcdefghijk")).toBe("abcdefghijk");
    expect(parseYouTubeId("https://youtu.be/abcdefghijk?t=20")).toBe("abcdefghijk");
    expect(parseYouTubeId("https://youtube.com/shorts/abcdefghijk")).toBe("abcdefghijk");
  });

  it("rejects non-HTTPS, lookalike and malformed YouTube URLs", () => {
    expect(parseYouTubeId("http://youtube.com/watch?v=abcdefghijk")).toBeNull();
    expect(parseYouTubeId("https://youtube.com.evil.test/watch?v=abcdefghijk")).toBeNull();
    expect(parseYouTubeId("https://example.com/watch?v=abcdefghijk")).toBeNull();
    expect(parseYouTubeId("https://youtu.be/short")).toBeNull();
  });

  it("accepts Drive file and document links but rejects other hosts", () => {
    expect(parseDriveId("https://drive.google.com/file/d/abcdefghij123/view")).toBe("abcdefghij123");
    expect(parseDriveId("https://docs.google.com/document/d/abcdefghij123/edit")).toBe("abcdefghij123");
    expect(parseDriveId("https://drive.google.com.evil.test/file/d/abcdefghij123")).toBeNull();
  });
});

describe("tutorial block validation", () => {
  it("accepts ordered text and provider video blocks", () => {
    const result = validateTutorialBlocks([
      { id: blockId, type: "text", content: "Explain the concept." },
      { id: "123e4567-e89b-42d3-a456-426614174002", type: "video", provider: "youtube", providerId: "abcdefghijk" },
    ], author);
    expect(result.ok).toBe(true);
  });

  it("requires private uploader-scoped media paths and alt text", () => {
    expect(validateTutorialBlocks([
      { id: blockId, type: "image", storagePath: "someone-else/tutorial/file.png", alt: "A diagram" },
    ], author).ok).toBe(false);
    expect(validateTutorialBlocks([
      { id: blockId, type: "diagram", storagePath: `${author}/tutorial/file.png` },
    ], author).ok).toBe(false);
  });

  it("rejects arbitrary iframe-like or unknown block types", () => {
    expect(validateTutorialBlocks([
      { id: blockId, type: "iframe", content: "<iframe src='https://evil.test'></iframe>" },
    ], author).ok).toBe(false);
  });

  it("rejects malformed video IDs and oversized text", () => {
    expect(validateTutorialBlocks([
      { id: blockId, type: "video", provider: "youtube", providerId: "bad-id" },
    ], author).ok).toBe(false);
    expect(validateTutorialBlocks([
      { id: blockId, type: "text", content: "x".repeat(20001) },
    ], author).ok).toBe(false);
  });
});
