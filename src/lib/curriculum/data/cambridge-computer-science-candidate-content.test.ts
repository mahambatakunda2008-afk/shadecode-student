import { describe, expect, it } from "vitest";
import {
  CAMBRIDGE_0478_ASSESSMENT,
  CAMBRIDGE_9618_ASSESSMENT,
  CAMBRIDGE_9618_CANDIDATE_CONTENT,
  CAMBRIDGE_IGCSE_0478_CANDIDATE_CONTENT,
  CAMBRIDGE_O_LEVEL_2210_CANDIDATE_CONTENT,
  CAMBRIDGE_CANDIDATE_SCOPES,
} from "./cambridge-computer-science-candidate-content";
import { isScopeUsable } from "../../code-lab/learning-scope";

const topicIds = (items: typeof CAMBRIDGE_IGCSE_0478_CANDIDATE_CONTENT) =>
  items.filter((item) => item.kind === "topic").map((item) => item.id);

describe("Cambridge Computer Science candidate scopes", () => {
  it("covers all ten Cambridge IGCSE/O Level CS topic families", () => {
    expect(topicIds(CAMBRIDGE_IGCSE_0478_CANDIDATE_CONTENT)).toHaveLength(10);
    expect(topicIds(CAMBRIDGE_O_LEVEL_2210_CANDIDATE_CONTENT)).toHaveLength(10);
  });

  it("covers all twenty 9618 sections", () => {
    expect(CAMBRIDGE_9618_CANDIDATE_CONTENT.filter((item) => item.kind === "topic")).toHaveLength(20);
  });

  it("keeps candidate scopes fail-closed until complete verification", () => {
    for (const scope of CAMBRIDGE_CANDIDATE_SCOPES) {
      expect(scope.complete).toBe(false);
      expect(scope.verified).toBe(false);
      expect(isScopeUsable(scope)).toBe(false);
    }
  });

  it("captures the distinct assessment models", () => {
    expect(CAMBRIDGE_0478_ASSESSMENT).toHaveLength(2);
    expect(CAMBRIDGE_9618_ASSESSMENT).toHaveLength(4);
    expect(CAMBRIDGE_9618_ASSESSMENT.find((paper) => paper.paper === "Paper 4")?.mode).toBe("practical");
  });

  it("keeps 0478 and 2210 as separate learner identities", () => {
    expect(CAMBRIDGE_CANDIDATE_SCOPES[0].identity.syllabusId).toBe("cambridge-0478");
    expect(CAMBRIDGE_CANDIDATE_SCOPES[1].identity.syllabusId).toBe("cambridge-2210");
    expect(CAMBRIDGE_CANDIDATE_SCOPES[0].identity.qualificationId).not.toBe(
      CAMBRIDGE_CANDIDATE_SCOPES[1].identity.qualificationId,
    );
  });
});
