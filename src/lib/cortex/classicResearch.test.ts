import { describe, expect, it } from "vitest";
import { isPublicAddress, rankClassicResearchResults } from "./classicResearch";

describe("Classic public address validation", () => {
  it.each([
    "0.1.2.3", "10.0.0.1", "100.64.0.1", "127.0.0.1", "169.254.1.1",
    "172.16.0.1", "192.0.2.1", "192.168.1.1", "198.18.0.1",
    "198.51.100.2", "203.0.113.8", "224.0.0.1", "240.0.0.1",
    "::1", "fc00::1", "fe80::1", "2001:db8::1", "2002::1",
  ])("rejects non-public address %s", (address) => expect(isPublicAddress(address)).toBe(false));

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111"])(
    "accepts public address %s", (address) => expect(isPublicAddress(address)).toBe(true),
  );
});

describe("Classic research relevance ranking", () => {
  let candidateId = 0;
  const make = (title: string, snippet: string) => ({ title, snippet, url: "https://example.org/" + (++candidateId) });
  it("ranks strong topic/title matches above weak mentions", () => {
    const weak = make("General science", "A broad introduction that briefly mentions waves among many other science topics.");
    const strong = make("Wave interference and diffraction", "Wave interference occurs when two or more waves overlap. Diffraction describes spreading around obstacles.");
    expect(rankClassicResearchResults([weak, strong], "Physics", "wave interference diffraction")[0]).toEqual(strong);
  });
  it("rejects results with no topic overlap", () => {
    expect(rankClassicResearchResults([make("Chemical bonding", "Ionic and covalent bonding explain compounds.")], "Physics", "wave interference")).toEqual([]);
  });
  it("keeps stable order for equal scores", () => {
    const first = make("Wave basics", "A useful explanation of wave properties and behaviour.");
    const second = make("Wave basics", "A useful explanation of wave properties and behaviour.");
    const ranked = rankClassicResearchResults([first, second], "Physics", "wave");
    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toBe(first);
    expect(ranked[1]).toBe(second);
  });
});

describe("Classic cached lesson matching", () => {
  it("requires a real saved topic before using phrase containment", async () => {
    const { matchesCachedClassicLesson } = await import("./classicResearch");
    expect(matchesCachedClassicLesson("Physics", "wave interference", "Physics", "", "A general physics lesson")).toBe(false);
  });
  it("matches the same subject and exact topic", async () => {
    const { matchesCachedClassicLesson } = await import("./classicResearch");
    expect(matchesCachedClassicLesson("Physics", "Wave Interference", "Physics", "wave interference", "Interference")).toBe(true);
  });
  it("never matches a cached lesson from another subject", async () => {
    const { matchesCachedClassicLesson } = await import("./classicResearch");
    expect(matchesCachedClassicLesson("Physics", "wave interference", "Mathematics", "wave interference", "Wave interference")).toBe(false);
  });
});
