import { isIP } from "node:net";

/** Resolve known search-engine redirect formats, then validate the destination URL. */
export function unwrapClassicSearchUrl(href: string): string {
  try {
    const url = new URL(href.replace(/&amp;/g, "&"), "https://html.duckduckgo.com");
    const hostname = url.hostname.toLowerCase();
    if (hostname === "duckduckgo.com" || hostname === "html.duckduckgo.com") {
      return normalizeClassicResearchUrl(url.searchParams.get("uddg") ?? "");
    }
    // Bing wraps organic destinations in a base64url value prefixed with "a1".
    if (hostname === "bing.com" || hostname.endsWith(".bing.com")) {
      const encoded = url.searchParams.get("u") ?? "";
      if (encoded.startsWith("a1")) {
        try {
          const base64 = encoded.slice(2).replace(/-/g, "+").replace(/_/g, "/");
          const decoded = Buffer.from(base64, "base64").toString("utf8");
          return normalizeClassicResearchUrl(decoded);
        } catch {
          return "";
        }
      }
      // Do not fetch Bing tracking endpoints or unknown redirect formats.
      return "";
    }
    // Never treat an unrecognised DuckDuckGo subdomain as a destination.
    if (hostname.includes("duckduckgo.com")) return "";
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

/** Parse DuckDuckGo HTML result anchors without assuming attribute order or snippet element type. */
export function extractClassicSearchCandidates(html: string): ClassicResearchCandidate[] {
  const anchors = Array.from(html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi));
  const results: ClassicResearchCandidate[] = [];
  for (let index = 0; index < anchors.length && results.length < 20; index += 1) {
    const match = anchors[index];
    const tag = match[0];
    const className = tag.match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    if (!className.split(/\s+/).includes("result__a")) continue;
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] ?? "";
    const title = tag.replace(/^<a\b[^>]*>/i, "").replace(/<\/a>$/i, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const nextAnchor = anchors.slice(index + 1).find((item) => {
      const nextClass = item[0].match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
      return nextClass.split(/\s+/).includes("result__a");
    });
    const start = (match.index ?? 0) + tag.length;
    const end = nextAnchor?.index ?? Math.min(html.length, start + 6000);
    const region = html.slice(start, end);
    const snippetMatch = region.match(/<([a-z][\w:-]*)\b(?=[^>]*\bclass\s*=\s*["'][^"']*\bresult__snippet\b)[^>]*>([\s\S]*?)<\/\1>/i);
    const snippet = (snippetMatch?.[2] ?? title).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (href && title) results.push({ title, url: href.replace(/&amp;/g, "&"), snippet });
  }
  return results;
}


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

/** Parse Bing organic result cards without depending on brittle markup attributes or regex escaping. */
export function extractBingSearchCandidates(html: string): ClassicResearchCandidate[] {
  const lower = html.toLowerCase();
  const results: ClassicResearchCandidate[] = [];
  let cursor = 0;
  while (results.length < 20) {
    const cardStart = lower.indexOf("<li", cursor);
    if (cardStart < 0) break;
    const cardOpenEnd = lower.indexOf(">", cardStart);
    const cardEnd = lower.indexOf("</li>", cardOpenEnd + 1);
    if (cardOpenEnd < 0 || cardEnd < 0) break;
    const openingTag = lower.slice(cardStart, cardOpenEnd + 1);
    const markup = html.slice(cardStart, cardEnd + 5);
    cursor = cardEnd + 5;
    if (!openingTag.includes("b_algo")) continue;

    const headingStart = lower.indexOf("<h2", cardStart);
    const headingOpenEnd = lower.indexOf(">", headingStart);
    const headingEnd = lower.indexOf("</h2>", headingOpenEnd + 1);
    if (headingStart < 0 || headingOpenEnd < 0 || headingEnd < 0 || headingEnd > cardEnd) continue;
    const anchorStart = lower.indexOf("<a", headingOpenEnd);
    const anchorOpenEnd = lower.indexOf(">", anchorStart);
    const anchorEnd = lower.indexOf("</a>", anchorOpenEnd + 1);
    if (anchorStart < 0 || anchorOpenEnd < 0 || anchorEnd < 0 || anchorEnd > headingEnd) continue;

    const anchorTag = html.slice(anchorStart, anchorOpenEnd + 1);
    const hrefPosition = anchorTag.toLowerCase().indexOf("href=");
    if (hrefPosition < 0) continue;
    const hrefValue = anchorTag.slice(hrefPosition + 5).trim();
    const quote = hrefValue[0];
    const hrefEnd = quote === '"' || quote === "'" ? hrefValue.indexOf(quote, 1) : hrefValue.search(/[ >]/);
    const href = hrefEnd > 0 ? hrefValue.slice(1, hrefEnd) : "";
    const title = html.slice(anchorOpenEnd + 1, anchorEnd)
      .replace(/<[^>]*>/g, " ").replaceAll("\n", " ").replaceAll("\r", " ").replaceAll("\t", " ")
      .split(" ").filter(Boolean).join(" ");

    const paragraphStart = lower.indexOf("<p", anchorEnd);
    const paragraphOpenEnd = lower.indexOf(">", paragraphStart);
    const paragraphEnd = lower.indexOf("</p>", paragraphOpenEnd + 1);
    const snippet = paragraphStart >= 0 && paragraphOpenEnd >= 0 && paragraphEnd >= 0 && paragraphEnd < cardEnd
      ? html.slice(paragraphOpenEnd + 1, paragraphEnd).replace(/<[^>]*>/g, " ").replaceAll("\n", " ").replaceAll("\r", " ").replaceAll("\t", " ").split(" ").filter(Boolean).join(" ")
      : title;
    if (href && title) results.push({ title, url: href.replace(/&amp;/g, "&"), snippet });
  }
  return results;
}
