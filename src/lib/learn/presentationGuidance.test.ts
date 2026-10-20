import { describe, expect, it } from "vitest";
import { buildPresentationGuidance } from "./presentationGuidance";

describe("buildPresentationGuidance", () => {
  it("keeps general lessons concise and avoids forced story formats", () => {
    const guidance = buildPresentationGuidance("Physics", "Waves");
    expect(guidance).toContain("concise, scannable notes");
    expect(guidance).toContain("Do not force the content into a story");
    expect(guidance).not.toContain("GEOGRAPHY CASE-STUDY CONTRACT");
  });

  it("requires evidence-led case study structure for Geography case-study requests", () => {
    const guidance = buildPresentationGuidance("Geography", "24 case studies for O-Level revision");
    expect(guidance).toContain("GEOGRAPHY CASE-STUDY CONTRACT");
    expect(guidance).toContain("location and context; process/issue; causes; impacts; management/response; outcomes; evidence; exam application");
    expect(guidance).toContain("VERIFY BEFORE MEMORISING");
    expect(guidance).toContain("do not replace the list with invented cases");
  });

  it("does not trigger the case-study contract for an ordinary Geography topic", () => {
    expect(buildPresentationGuidance("Geography", "Weather and climate")).not.toContain("GEOGRAPHY CASE-STUDY CONTRACT");
  });
});
