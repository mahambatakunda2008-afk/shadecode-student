import { describe, expect, it } from "vitest";
import { ZIMSEC_O_LEVEL_CS_4021_CONTENT_PACK } from "./data/zimsec-o-level-computer-science-4021-content-pack";
import { packToLearningScope } from "./content-scope";
import { isContentAligned, isScopeUsable } from "../code-lab/learning-scope";

describe("authoritative content packs", () => {
  it("preserves exact curriculum identity", () => {
    expect(ZIMSEC_O_LEVEL_CS_4021_CONTENT_PACK.identity).toMatchObject({
      kind: "curriculum",
      boardId: "zimsec",
      qualificationId: "zimsec-o-level",
      level: "o_level",
      syllabusId: "zimsec-4021",
      syllabusVersion: "2024-2030",
      subjectId: "computer-science",
    });
  });

  it("does not treat the current draft inventory as production-ready", () => {
    const scope = packToLearningScope(ZIMSEC_O_LEVEL_CS_4021_CONTENT_PACK);
    expect(scope.complete).toBe(false);
    expect(scope.verified).toBe(false);
    expect(isScopeUsable(scope)).toBe(false);
  });

  it("preserves both objectives and broader topic content", () => {
    const kinds = new Set(ZIMSEC_O_LEVEL_CS_4021_CONTENT_PACK.content.map((item) => item.kind));
    expect(kinds.has("objective")).toBe(true);
    expect(kinds.has("topic")).toBe(true);
  });

  it("cannot align an activity to a draft scope", () => {
    const scope = packToLearningScope(ZIMSEC_O_LEVEL_CS_4021_CONTENT_PACK);
    const first = scope.content[0];
    expect(isContentAligned([first.id], scope)).toBe(false);
  });
});
