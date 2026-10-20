import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShadecodeFeatureIcon, type ShadecodeFeatureName } from "./ShadecodeFeatureIcon";

const FEATURES: ShadecodeFeatureName[] = ["home","learn","exam-sim","math-checker","focus","timetable","leaderboard","code-lab","past-papers","insights","profile","settings","tasks","assessments","courses","study","study-plan","progress","achievements","share","whatsapp","virtual-lab","workmate","projects","studyspace"];
const render = (feature: ShadecodeFeatureName, active = false) =>
  renderToStaticMarkup(createElement(ShadecodeFeatureIcon, { feature, tile: false, active }));

describe("ShadecodeFeatureIcon", () => {
  it("draws a glyph for every feature name (no silent blanks)", () => {
    for (const f of FEATURES) expect(render(f), f).toMatch(/<(path|circle|rect)\b/);
  });
  it("uses the same stroke weights as lucide icons (2, active 2.35) for every glyph", () => {
    for (const f of FEATURES) {
      expect(render(f), f).toContain('stroke-width="2"');
      expect(render(f, true), f).toContain('stroke-width="2.35"');
    }
  });
  it("gives achievements and leaderboard different glyphs", () => {
    expect(render("achievements")).not.toBe(render("leaderboard"));
  });
});
