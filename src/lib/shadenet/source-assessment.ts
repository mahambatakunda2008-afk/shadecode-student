import type { ShadeNetResource } from "./content";

export type SourceAuthority = "official-exam-board" | "government" | "academic-institution" | "unclassified";
export type SourceFreshness = "current" | "aging" | "older" | "undated";

export interface SourceAssessment {
  authority: SourceAuthority;
  authorityReason: string;
  hostname: string | null;
  freshness: SourceFreshness;
  dateUsed: string | null;
  dateReason: string;
  relatedHostCount: number;
  relatedHosts: string[];
  relationship: "similar-coverage" | "single-source";
  reviewFlags: string[];
}

export interface AssessedKnowledge {
  resource: ShadeNetResource;
  assessment: SourceAssessment;
}

const OFFICIAL_EXAM_BOARD_HOSTS = ["cambridgeinternational.org", "zimsec.co.zw"];
const GOVERNMENT_SUFFIXES = [".gov", ".gov.zw", ".gov.uk"];
const ACADEMIC_SUFFIXES = [".edu", ".ac.zw", ".ac.uk"];

function hostnameOf(resource: ShadeNetResource): string | null {
  const source = resource.metadata.source;
  if (!source) return null;
  try {
    const url = new URL(source);
    return url.protocol === "https:" ? url.hostname.toLowerCase().replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function authorityFor(hostname: string | null): { authority: SourceAuthority; reason: string } {
  if (!hostname) return { authority: "unclassified", reason: "No public HTTPS publisher hostname is available." };
  if (OFFICIAL_EXAM_BOARD_HOSTS.some((host) => matchesDomain(hostname, host))) {
    return { authority: "official-exam-board", reason: "Hostname matches a configured Cambridge International or ZIMSEC official domain. Check the exact page and document." };
  }
  if (GOVERNMENT_SUFFIXES.some((suffix) => hostname.endsWith(suffix) || hostname.includes(`${suffix}.`))) {
    return { authority: "government", reason: "Government-domain signal only; this does not establish that the page is relevant or authoritative for this topic." };
  }
  if (ACADEMIC_SUFFIXES.some((suffix) => hostname.endsWith(suffix) || hostname.includes(`${suffix}.`))) {
    return { authority: "academic-institution", reason: "Academic-institution domain signal only; authorship and page quality still need review." };
  }
  return { authority: "unclassified", reason: "Publisher is not in the configured authority-domain list." };
}

function contentRecord(resource: ShadeNetResource): Record<string, unknown> {
  return resource.content && typeof resource.content === "object"
    ? resource.content as Record<string, unknown>
    : {};
}

function publicationDate(resource: ShadeNetResource): string | null {
  const content = contentRecord(resource);
  for (const candidate of [content.publishedAt, content.lastModified]) {
    if (typeof candidate === "string" && candidate.trim() && Number.isFinite(Date.parse(candidate))) {
      return new Date(candidate).toISOString();
    }
  }
  return null;
}

function freshnessFor(date: string | null, now: number): SourceFreshness {
  if (!date) return "undated";
  const age = now - Date.parse(date);
  if (age < -86_400_000) return "undated";
  const years = age / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 2) return "current";
  if (years < 5) return "aging";
  return "older";
}

function textOf(resource: ShadeNetResource): string {
  const content = contentRecord(resource);
  const parts = [resource.metadata.title, content.snippet, content.pageText, content.text]
    .filter((value): value is string => typeof value === "string");
  return parts.join(" ").toLowerCase().normalize("NFKC");
}

function titleTokens(resource: ShadeNetResource): Set<string> {
  return new Set(resource.metadata.title.toLowerCase().normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

function reviewFlags(resources: ShadeNetResource[]): string[] {
  if (resources.length < 2) return [];
  const texts = resources.map(textOf);
  const numericSets = texts.map((text) => new Set(text.match(/\b\d+(?:\.\d+)?\s?(?:%|°c|°f|years?|months?|days?)?\b/g) ?? []));
  const nonEmptyNumeric = numericSets.filter((set) => set.size > 0);
  const flags: string[] = [];
  if (nonEmptyNumeric.length > 1) {
    const first = [...nonEmptyNumeric[0]].sort().join("|");
    if (nonEmptyNumeric.slice(1).some((set) => [...set].sort().join("|") !== first)) {
      flags.push("Different numerical details appear across related results; compare the original sources.");
    }
  }
  const negation = texts.map((text) => /\b(no|not|never|cannot|doesn't|isn't|aren't)\b/.test(text));
  if (negation.some(Boolean) && negation.some((value) => !value)) {
    flags.push("Related results use different negation signals; inspect the wording before combining them.");
  }
  return flags;
}

/**
 * Adds transparent, deterministic source signals. These are heuristics, not
 * fact-checking: similar coverage is not proof that a claim is true.
 */
export function assessKnowledgeSources(
  resources: ShadeNetResource[],
  now = Date.now(),
): AssessedKnowledge[] {
  const hosts = resources.map(hostnameOf);
  const tokens = resources.map(titleTokens);
  const groups: number[][] = [];

  resources.forEach((resource, index) => {
    const subject = (resource.metadata.subject ?? "").toLowerCase().trim();
    let group = groups.find((indices) => {
      const first = resources[indices[0]];
      return (first.metadata.subject ?? "").toLowerCase().trim() === subject &&
        jaccard(tokens[indices[0]], tokens[index]) >= 0.5;
    });
    if (!group) {
      group = [];
      groups.push(group);
    }
    group.push(index);
  });

  const result: Array<AssessedKnowledge | null> = resources.map((resource, index) => {
    const hostname = hosts[index];
    const authority = authorityFor(hostname);
    const dateUsed = publicationDate(resource);
    const group = groups.find((indices) => indices.includes(index)) ?? [index];
    const relatedHosts = [...new Set(group.map((i) => hosts[i]).filter((host): host is string => Boolean(host)))].sort();
    const freshness = freshnessFor(dateUsed, now);
    const flags = reviewFlags(group.map((i) => resources[i]));
    return {
      resource,
      assessment: {
        ...authority,
        hostname,
        freshness,
        dateUsed,
        dateReason: dateUsed ? "Based on publisher-provided publication or last-modified metadata." : "No usable publication or last-modified date was supplied; retrieval time is not treated as publication time.",
        relatedHostCount: relatedHosts.length,
        relatedHosts,
        relationship: relatedHosts.length > 1 ? "similar-coverage" : "single-source",
        reviewFlags: flags,
      },
    };
  });
  return result.filter((item): item is AssessedKnowledge => item !== null);
}
