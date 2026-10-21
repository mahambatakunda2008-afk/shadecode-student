import { describe, expect, it } from "vitest";
import { evaluateCurriculumDocumentEvidence, shouldProcessCurriculumDocument } from "./document-evidence";

describe("curriculum document evidence state", () => {
  it("preserves verification only when the source fingerprint is unchanged", () => {
    expect(evaluateCurriculumDocumentEvidence({
      previousHash: "sha-a", incomingHash: "sha-a", previousStatus: "verified", extractedText: "syllabus text",
    })).toMatchObject({ changed: false, documentStatus: "verified", extractedCharacters: 13, extractionSucceeded: true });
  });

  it("invalidates a verified state when source bytes change", () => {
    expect(evaluateCurriculumDocumentEvidence({
      previousHash: "sha-a", incomingHash: "sha-b", previousStatus: "verified", extractedText: "new text",
    })).toMatchObject({ changed: true, documentStatus: "draft", extractedCharacters: 8, extractionSucceeded: true });
  });

  it("does not report extraction when text is empty or whitespace", () => {
    expect(evaluateCurriculumDocumentEvidence({
      previousHash: "sha-a", incomingHash: "sha-b", previousStatus: "verified", extractedText: "   ",
    })).toMatchObject({ changed: true, documentStatus: "draft", extractedText: null, extractedCharacters: 0, extractionSucceeded: false });
  });

  it("preserves archived state when the source fingerprint is unchanged", () => {
    expect(evaluateCurriculumDocumentEvidence({
      previousHash: "sha-a", incomingHash: "sha-a", previousStatus: "archived", extractedText: null,
    })).toMatchObject({ changed: false, documentStatus: "archived" });
  });

  it("never trusts an upstream character count because it is not an input", () => {
    expect(evaluateCurriculumDocumentEvidence({
      previousHash: "sha-a", incomingHash: "sha-a", previousStatus: "draft", extractedText: null,
    })).toMatchObject({ documentStatus: "draft", extractedCharacters: 0, extractionSucceeded: false });
  });

  it("reprocesses an unchanged source when extracted text has just been recovered", () => {
    expect(shouldProcessCurriculumDocument({
      changed: false,
      previousExtractedText: null,
      extractedText: "recovered syllabus text",
    })).toBe(true);
  });

  it("skips an unchanged source when its extracted text was already persisted", () => {
    expect(shouldProcessCurriculumDocument({
      changed: false,
      previousExtractedText: "already stored syllabus text",
      extractedText: "already stored syllabus text",
    })).toBe(false);
  });

  it("does not process an unchanged source if extraction is still unavailable", () => {
    expect(shouldProcessCurriculumDocument({
      changed: false,
      previousExtractedText: null,
      extractedText: null,
    })).toBe(false);
  });

  it("always processes a changed source fingerprint", () => {
    expect(shouldProcessCurriculumDocument({
      changed: true,
      previousExtractedText: "old text",
      extractedText: "new text",
    })).toBe(true);
  });
});
