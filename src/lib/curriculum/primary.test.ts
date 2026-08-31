import { describe, expect, it } from "vitest";
import { getPrimaryLearningPolicy, getPrimarySubjectProfile, getPrimaryGradeBand } from "./primary";
describe("primary learner support",()=>{
 it("covers the full primary grade span",()=>{expect(getPrimaryGradeBand(1).ageRange).toBe("6-7");expect(getPrimaryGradeBand(7).ageRange).toBe("12-13");});
 it("keeps primary explanations scaffolded and visual",()=>{const p=getPrimaryLearningPolicy();expect(p.requireScaffolding).toBe(true);expect(p.preferVisuals).toBe(true);expect(p.allowAdvancedNotation).toBe(false);});
 it("supports core Zimbabwe-relevant primary subjects",()=>{expect(getPrimarySubjectProfile("Mathematics").skills.length).toBeGreaterThan(0);expect(getPrimarySubjectProfile("English").skills.length).toBeGreaterThan(0);expect(getPrimarySubjectProfile("Heritage Studies").skills.length).toBeGreaterThan(0);});
});
