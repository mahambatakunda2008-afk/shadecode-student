/**
 * Conservative syllabus-version discovery.
 *
 * We only accept versions that are explicitly represented in the source
 * document metadata/text. The parser may return `unversioned`, but callers
 * must keep that snapshot draft-only until a human/source verification step
 * establishes the exact syllabus version.
 */

export interface CurriculumVersionEvidence {
  version: string | null;
  confidence: "high" | "medium" | "none";
  evidence: string[];
}

const VERSION_PATTERNS = [
  /\b(?:syllabus|specification|curriculum)\s+(?:version|v(?:ersion)?\.?)[\s:._-]*([0-9]{4}(?:[-/][0-9]{2,4})?|[0-9]+(?:\.[0-9]+)*)\b/i,
  /\b(?:syllabus|specification|curriculum)[\s_-]*(20[0-9]{2}\s*[-/]\s*(?:20)?[0-9]{2})\b/i,
  /\b(20[0-9]{2}\s*[-/]\s*(?:20)?[0-9]{2})\b/i,
  /\b(?:for|from|effective)\s+(20[0-9]{2}(?:\s*[-/]\s*(?:20)?[0-9]{2})?)\b/i,
];

function normalizeVersion(value: string): string {
  return value.replace(/\s+/g, "").replace(/\//g, "-");
}

export function discoverSyllabusVersion(text: string, title = ""): CurriculumVersionEvidence {
  const haystack = `${title}\n${text.slice(0, 12000)}`;
  const evidence: string[] = [];

  for (const pattern of VERSION_PATTERNS) {
    const match = pattern.exec(haystack);
    if (!match) continue;
    const version = normalizeVersion(match[1]);
    const contextStart = Math.max(0, (match.index ?? 0) - 90);
    const contextEnd = Math.min(haystack.length, (match.index ?? 0) + match[0].length + 90);
    evidence.push(haystack.slice(contextStart, contextEnd).replace(/\s+/g, " ").trim());
    return {
      version,
      confidence: pattern === VERSION_PATTERNS[0] || pattern === VERSION_PATTERNS[1] ? "high" : "medium",
      evidence,
    };
  }

  return { version: null, confidence: "none", evidence: [] };
}

export function resolveSyllabusVersion(
  configuredVersion: string | null | undefined,
  discovered: CurriculumVersionEvidence,
): CurriculumVersionEvidence {
  if (configuredVersion) {
    return {
      version: configuredVersion,
      confidence: "high",
      evidence: ["Source registry explicitly configured this syllabus version."],
    };
  }
  return discovered;
}
