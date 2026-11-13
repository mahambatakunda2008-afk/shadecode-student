import { describe, expect, it } from "vitest";
import { prepareMarkingResourceImport } from "./marking-resource-import";

function makePdf(name = "scheme.pdf", text = "mark scheme") {
  return new File([text], name, { type: "application/pdf" });
}

const identity = {
  boardId: "cambridge",
  qualificationId: "as-level",
  level: "AS",
  subjectId: "9702",
  syllabusId: "9702",
  syllabusVersion: "2025-2027",
};

describe("prepareMarkingResourceImport", () => {
  it("preserves a user upload with a SHA-256 fingerprint and conservative rights defaults", async () => {
    const result = await prepareMarkingResourceImport("learner-1", {
      file: makePdf(),
      kind: "official_mark_scheme",
      ...identity,
    });

    expect(result.ownerId).toBe("learner-1");
    expect(result.access).toBe("user_upload");
    expect(result.reuse).toBe("unknown");
    expect(result.review).toBe("retrieved");
    expect(result.extractionStatus).toBe("pending");
    expect(result.fileBlob.size).toBe(result.byteLength);
    expect(result.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.extractionWarnings).toHaveLength(3);
  });

  it("rejects unsupported file types", async () => {
    await expect(prepareMarkingResourceImport("learner-1", {
      file: new File(["x"], "scheme.exe", { type: "application/octet-stream" }),
      kind: "other",
      ...identity,
    })).rejects.toThrow("Supported resource files");
  });

  it("rejects a mismatched PDF extension and MIME type", async () => {
    await expect(prepareMarkingResourceImport("learner-1", {
      file: new File(["x"], "scheme.pdf", { type: "image/png" }),
      kind: "other",
      ...identity,
    })).rejects.toThrow("extension and detected type do not match");
  });

  it("requires complete syllabus identity before accepting a document", async () => {
    await expect(prepareMarkingResourceImport("learner-1", {
      file: makePdf(),
      kind: "other",
      ...identity,
      syllabusVersion: " ",
    })).rejects.toThrow("Syllabus version is required");
  });

  it("rejects invalid exam years", async () => {
    await expect(prepareMarkingResourceImport("learner-1", {
      file: makePdf(),
      kind: "other",
      ...identity,
      examYear: 1800,
    })).rejects.toThrow("valid four-digit year");
  });

  it("requires a signed-in owner", async () => {
    await expect(prepareMarkingResourceImport(" ", {
      file: makePdf(),
      kind: "other",
      ...identity,
    })).rejects.toThrow("Signed-in account is required");
  });
});
