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

  // Cambridge often states the examination cycle as a three-year list rather
  // than a hyphenated range (for example, "for exams in 2028, 2029 and 2030").
  const examSeries = /\\b(?:for\\s+exams?\\s+in|exams?\\s+in)\\s+(20\\d{2})\\s*,\\s*(20\\d{2})\\s+and\\s+(20\\d{2})\\b/i.exec(haystack);
  if (examSeries) {
    const years = examSeries.slice(1, 4).map(Number);
    if (years[1] === years[0] + 1 && years[2] === years[1] + 1) {
      const contextStart = Math.max(0, (examSeries.index ?? 0) - 90);
      const contextEnd = Math.min(haystack.length, (examSeries.index ?? 0) + examSeries[0].length + 90);
      evidence.push(haystack.slice(contextStart, contextEnd).replace(/\\s+/g, " ").trim());
      return { version: `${years[0]}-${years[2]}`, confidence: "high", evidence };
    }
  }

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
