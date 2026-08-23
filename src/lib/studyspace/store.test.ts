import { describe, expect, it } from "vitest";
import { deleteStudySession, getStudySession, saveStudySession } from "./store";

describe("StudySpace session persistence", () => {
  it("exports resumable session persistence APIs", () => {
    expect(saveStudySession).toBeTypeOf("function");
    expect(getStudySession).toBeTypeOf("function");
    expect(deleteStudySession).toBeTypeOf("function");
  });
});
