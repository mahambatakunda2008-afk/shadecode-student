import { describe, expect, it } from "vitest";
import { extractBingSearchCandidates, extractClassicSearchCandidates, isClassicResearchTextRelevant, isPublicAddress, normalizeClassicResearchUrl, rankClassicResearchResults, unwrapClassicSearchUrl } from "./classicResearch";

describe("Classic public address validation", () => {
  it.each([
    "0.1.2.3", "10.0.0.1", "100.64.0.1", "127.0.0.1", "169.254.1.1",
    "172.16.0.1", "192.0.2.1", "192.168.1.1", "198.18.0.1",
    "198.51.100.2", "203.0.113.8", "224.0.0.1", "240.0.0.1",
    "::1", "fc00::1", "fe80::1", "2001:db8::1", "2002::1",
    "::ffff:8.8.8.8", "2001:4860:4860::8888%eth0",
  ])("rejects non-public or ambiguous address %s", (address) => expect(isPublicAddress(address)).toBe(false));

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "2606:4700:4700::1111"] )(
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

describe("Fetched Classic research text relevance", () => {
  it("rejects an extracted page that does not discuss the requested topic", () => {
    expect(isClassicResearchTextRelevant("A long article about chemical bonding and atomic structure.", "Physics", "wave interference")).toBe(false);
  });
  it("accepts page text with meaningful topic coverage", () => {
    expect(isClassicResearchTextRelevant("Wave interference occurs when waves overlap. Diffraction is the spreading of waves.", "Physics", "wave interference diffraction")).toBe(true);
  });
});

describe("Classic research URL validation", () => {
  it.each([
    "http://example.org/resource", "https://user:pass@example.org/", "https://example.org:8443/",
    "https://localhost/", "https://app.localhost/", "https://printer.local/", "https://service.internal/",
    "https://127.0.0.1/", "https://[::1]/", "https://192.168.1.10/", "not a URL",
  ])("rejects unsafe research URL %s", (url) => expect(normalizeClassicResearchUrl(url)).toBe(""));

  it.each([
    ["https://example.org/resource", "https://example.org/resource"],
    ["https://www.example.org/path?q=waves", "https://www.example.org/path?q=waves"],
  ])("accepts public HTTPS URL %s", (input, expected) => expect(normalizeClassicResearchUrl(input)).toBe(expected));
});


describe("Classic search redirect handling", () => {
  it("unwraps a DuckDuckGo redirect to a validated HTTPS destination", () => {
    const target = encodeURIComponent("https://www.example.org/physics/waves");
    expect(unwrapClassicSearchUrl(`https://html.duckduckgo.com/l/?uddg=${target}`)).toBe("https://www.example.org/physics/waves");
  });
  it("accepts direct public HTTPS results", () => {
    expect(unwrapClassicSearchUrl("https://www.example.org/physics/waves")).toBe("https://www.example.org/physics/waves");
  });
  it.each([
    "https://duckduckgo.com.evil.example/l/?uddg=https%3A%2F%2Fexample.org",
    "https://search.duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org",
    "https://html.duckduckgo.com/l/?uddg=http%3A%2F%2Fexample.org",
    "https://html.duckduckgo.com/l/?uddg=https%3A%2F%2F127.0.0.1",
  ])("rejects malformed or unsafe redirect %s", (url) => expect(unwrapClassicSearchUrl(url)).toBe(""));
});


describe("Classic DuckDuckGo HTML extraction", () => {
  it("extracts result links when href and class attributes appear in either order", () => {
    const html = `
      <div class="result">
        <a rel="nofollow" class="result__a" href="https://html.duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Fwaves">Wave interference</a>
        <div class="result__snippet">Wave interference occurs when waves overlap and combine.</div>
      </div>
      <div class="result">
        <a href="https://example.org/diffraction" class="result__a">Diffraction of waves</a>
        <a class="result__snippet">Diffraction is the spreading of waves around obstacles.</a>
      </div>`;
    const results = extractClassicSearchCandidates(html);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ title: "Wave interference", url: "https://html.duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Fwaves" });
    expect(results[0].snippet).toContain("Wave interference occurs");
    expect(results[1].title).toBe("Diffraction of waves");
    expect(results[1].snippet).toContain("Diffraction is the spreading");
  });
});
