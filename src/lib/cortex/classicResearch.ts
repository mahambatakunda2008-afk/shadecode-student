import { isIP } from "node:net";

/** Resolve only the known DuckDuckGo redirect hosts, then validate the destination URL. */
export function unwrapClassicSearchUrl(href: string): string {
  try {
    const url = new URL(href.replace(/&amp;/g, "&"), "https://html.duckduckgo.com");
    const hostname = url.hostname.toLowerCase();
    if (hostname === "duckduckgo.com" || hostname === "html.duckduckgo.com") {
      return normalizeClassicResearchUrl(url.searchParams.get("uddg") ?? "");
    }
    // Never treat an unrecognised DuckDuckGo subdomain as a destination.
    if (hostname.endsWith(".duckduckgo.com")) return "";
    return normalizeClassicResearchUrl(url.href);
  } catch {
    return "";
  }
}

/** Accept only ordinary HTTPS host URLs suitable for server-side public research fetches. */
export function normalizeClassicResearchUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase().replace(/^\\[|\\]$/g, "");
    if (url.protocol !== "https:" || !hostname || url.username || url.password || url.port ||
      isIP(hostname) || hostname === "localhost" || hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") || hostname.endsWith(".internal") ||
      hostname.includes("%") || !hostname.includes(".")) return "";
    return url.href;
  } catch {
    return "";
  }
}

export function isPublicAddress(address: string): boolean {
  // Zone identifiers are interface-scoped and must never be accepted for outbound fetches.
  if (address.includes("%")) return false;
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split(".").map(Number);
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    const value = octets.reduce((result, part) => (result * 256) + part, 0);
    const inRange = (network: number[], prefix: number) => {
      const base = network.reduce((result, part) => (result * 256) + part, 0);
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      return ((value >>> 0) & mask) === ((base >>> 0) & mask);
    };
    const denied: Array<[number[], number]> = [
      [[0,0,0,0],8], [[10,0,0,0],8], [[100,64,0,0],10],
      [[127,0,0,0],8], [[169,254,0,0],16], [[172,16,0,0],12],
      [[192,0,0,0],24], [[192,0,2,0],24], [[192,88,99,0],24],
      [[192,168,0,0],16], [[198,18,0,0],15], [[198,51,100,0],24],
      [[203,0,113,0],24], [[224,0,0,0],4], [[240,0,0,0],4],
    ];
    return !denied.some(([network, prefix]) => inRange(network, prefix));
  }
  if (version === 6) {
    // Only global-unicast 2000::/3 is eligible. Reject transition,
    // documentation, and special-purpose allocations conservatively.
    const parts = address.toLowerCase().split(":");
    const first = Number.parseInt(parts[0] || "0", 16);
    const second = Number.parseInt(parts[1] || "0", 16);
    if (!Number.isFinite(first) || first < 0x2000 || first > 0x3fff) return false;
    if (first === 0x2001 && (second <= 0x01ff || second === 0x0db8)) return false;
    if (first === 0x2002 || (first === 0x3fff && second <= 0x0fff)) return false;
    return true;
  }
  return false;
}

const stopwords = new Set(["about","from","with","that","this","into","lesson","explained","their","there","which","where","what","when","have","will","your","using","used"]);
function terms(value: string) {
  return Array.from(new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length >= 3 && !stopwords.has(term))));
}

export interface ClassicResearchCandidate { title: string; url: string; snippet: string; }

export function rankClassicResearchResults<T extends ClassicResearchCandidate>(
  candidates: T[], subject: string, topic: string, limit = 5,
): T[] {
  const topicTerms = terms(topic), subjectTerms = terms(subject);
  return candidates.map((candidate, index) => {
    const searchable = (candidate.title + " " + candidate.snippet).toLowerCase();
    const topicHits = topicTerms.filter((term) => searchable.includes(term)).length;
    const subjectHits = subjectTerms.filter((term) => searchable.includes(term)).length;
    const topicCoverage = topicTerms.length ? topicHits / topicTerms.length : 1;
    const subjectCoverage = subjectTerms.length ? subjectHits / subjectTerms.length : 1;
    const titleHits = topicTerms.filter((term) => candidate.title.toLowerCase().includes(term)).length;
    const score = topicCoverage * 6 + subjectCoverage * 2 + titleHits * 2 + (candidate.snippet.length >= 180 ? 0.5 : 0);
    return { candidate, index, score, topicHits, topicCoverage };
  }).filter(({ topicHits, topicCoverage }) => topicHits > 0 && !(topicTerms.length >= 3 && topicCoverage < 0.34))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, limit)).map(({ candidate }) => candidate);
}

export function isClassicResearchTextRelevant(text: string, subject: string, topic: string): boolean {
  const topicTerms = terms(topic);
  if (!text.trim() || !topicTerms.length) return false;
  const searchable = text.toLowerCase();
  const hits = topicTerms.filter((term) => searchable.includes(term)).length;
  const coverage = hits / topicTerms.length;
  return hits > 0 && (topicTerms.length < 3 || coverage >= 0.34);
}
