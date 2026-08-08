import { describe, it, expect } from "vitest";
import { selectSessionTopic } from "../generator";

describe("selectSessionTopic", () => {
  it("exam sessions use a fixed activity-type pool regardless of hints (not a personalized topic claim)", () => {
    const activities = ["Full past paper", "Timed practice", "Mock exam"];
    for (let i = 0; i < 20; i++) {
      const topic = selectSessionTopic("Mathematics", "exam");
      expect(activities).toContain(topic);
    }
  });

  it("learn sessions pick from real 'fresh' hints when provided", () => {
    const hints = { weak: [], fresh: ["Vectors", "Trigonometric Identities"] };
    for (let i = 0; i < 20; i++) {
      const topic = selectSessionTopic("Mathematics", "learn", hints);
      expect(hints.fresh).toContain(topic);
    }
  });

  it("learn sessions fall back to an honest generic label when no fresh hints exist, never a fabricated specific one", () => {
    const topic = selectSessionTopic("Mathematics", "learn");
    expect(topic).toBe("Mathematics — next topic");
    // Explicitly not one of the old hardcoded fake topics
    expect(topic).not.toBe("Algebra fundamentals");
  });

  it("learn sessions fall back to generic when hints exist but fresh is empty", () => {
    const topic = selectSessionTopic("Physics", "learn", { weak: ["Mechanics"], fresh: [] });
    expect(topic).toBe("Physics — next topic");
  });

  it("practice/revision sessions pick from real 'weak' hints when provided", () => {
    const hints = { weak: ["Organic Chemistry Naming", "Redox Reactions"], fresh: [] };
    for (const type of ["practice", "revision", "catchup"]) {
      let sawRealTopic = false;
      for (let i = 0; i < 20; i++) {
        const topic = selectSessionTopic("Chemistry", type, hints);
        expect(hints.weak).toContain(topic);
        sawRealTopic = true;
      }
      expect(sawRealTopic).toBe(true);
    }
  });

  it("practice/revision sessions fall back to an honest generic label with no fabricated specifics", () => {
    const topic = selectSessionTopic("Biology", "revision");
    expect(topic).toBe("Biology — core review");
    expect(topic).not.toBe("Key concepts");
  });

  it("never returns a topic from another subject's hints", () => {
    const hints = { weak: ["Cell Structure"], fresh: ["Genetics"] };
    const learnTopic = selectSessionTopic("Biology", "learn", hints);
    const practiceTopic = selectSessionTopic("Biology", "practice", hints);
    expect(["Genetics", "Biology — next topic"]).toContain(learnTopic);
    expect(["Cell Structure", "Biology — core review"]).toContain(practiceTopic);
  });
});
