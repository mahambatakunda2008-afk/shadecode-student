import type {
  CurriculumKnowledgeIdentity,
  CurriculumKnowledgeItem,
  CurriculumKnowledgeKind,
  CurriculumKnowledgeProvenance,
} from "./knowledge";

export interface CurriculumExtractionProfile {
  topicHeadings?: string[];
  sectionKinds?: Record<string, CurriculumKnowledgeKind>;
  objectiveCodePattern?: string;
  assessmentPatterns?: RegExp[];
  paperPatterns?: RegExp[];
  terminologyHeadings?: string[];
}

const DEFAULT_SECTION_KINDS: Record<string, CurriculumKnowledgeKind> = {
  topics: "topic",
  "content overview": "content_scope",
  "content": "content_scope",
  competencies: "competency",
  "learning outcomes": "learning_outcome",
  "learning objectives": "objective",
  assessment: "assessment_requirement",
  "assessment objectives": "assessment_requirement",
  "examination format": "examination_format",
  "paper structure": "paper_component",
  "practical activities": "practical_activity",
  "project requirements": "project_requirement",
  prerequisites: "prerequisite",
  progression: "progression",
  terminology: "terminology",
  definitions: "terminology",
  resources: "resource",
  guidance: "guidance",
  notes: "note",
  constraints: "constraint",
};

function normalizeHeading(value: string): string {
  return value.replace(/^[\s\d.()_-]+/, "").replace(/[\s:.-]+$/, "").trim().toLowerCase();
}

interface HeadingInfo {
  normalized: string;
  level: number;
  raw: string;
}

function headingInfo(line: string): HeadingInfo | null {
  const cleaned = line.replace(/^#+\s*/, "").trim();
  const match = cleaned.match(/^(?:(\d+(?:\.\d+)*?)[.)]?\s+)?([A-Za-z][A-Za-z /&'_-]{2,100})\s*:?$/);
  if (!match) return null;
  const level = match[1] ? match[1].split(".").length : 1;
  return { normalized: normalizeHeading(match[2]), level, raw: cleaned };
}

function isHeading(line: string, profile: CurriculumExtractionProfile): HeadingInfo | null {
  const info = headingInfo(line);
  if (!info) return null;
  const allowed = new Set([
    ...Object.keys(DEFAULT_SECTION_KINDS),
    ...Object.keys(profile.sectionKinds ?? {}).map(normalizeHeading),
    ...(profile.topicHeadings ?? []).map(normalizeHeading),
    ...(profile.terminologyHeadings ?? []).map(normalizeHeading),
  ]);
  return allowed.has(info.normalized) ? info : null;
}

function makeItem(
  kind: CurriculumKnowledgeKind,
  title: string,
  content: string,
  identity: CurriculumKnowledgeIdentity,
  provenance: CurriculumKnowledgeProvenance,
  index: number,
  extra: Partial<CurriculumKnowledgeItem> = {},
): CurriculumKnowledgeItem {
  return {
    id: crypto.randomUUID(),
    kind,
    code: extra.code,
    title: title || `${kind} ${index + 1}`,
    content,
    status: "draft",
    identity,
    provenance,
    ...extra,
  };
}

function extractSectionBlocks(
  text: string,
  identity: CurriculumKnowledgeIdentity,
  provenance: CurriculumKnowledgeProvenance,
  profile: CurriculumExtractionProfile,
): CurriculumKnowledgeItem[] {
  const lines = text.split(/\r?\n/);
  const items: CurriculumKnowledgeItem[] = [];
  let currentHeading: HeadingInfo | null = null;
  let currentHeadingLine = 0;
  let buffer: string[] = [];
  const topicStack: Array<{ level: number; id: string; key: string }> = [];

  const flush = (endLine: number) => {
    if (!currentHeading) return;
    const content = buffer.join(" ").replace(/\s+/g, " ").trim();
    if (!content) return;
    const kind = profile.sectionKinds?.[currentHeading.normalized] ?? DEFAULT_SECTION_KINDS[currentHeading.normalized];
    if (!kind) return;
    const parent = topicStack.length ? topicStack[topicStack.length - 1] : undefined;
    const chunks = content.split(/\s*;\s*|(?<=\.)\s+(?=\d+\.\s)/).filter(Boolean);
    chunks.forEach((chunk, index) => {
      const item = makeItem(kind, currentHeading!.normalized, chunk.trim(), identity, {
        ...provenance,
        sectionOrPage: provenance.sectionOrPage ?? `${currentHeading!.raw} (lines ${currentHeadingLine}-${endLine})`,
      }, index, {
        parentId: parent?.id,
        metadata: {
          extraction: "section",
          section: currentHeading!.normalized,
          heading: currentHeading!.raw,
          headingLevel: currentHeading!.level,
          lineStart: currentHeadingLine,
          lineEnd: endLine,
          parentKnowledgeKey: parent?.key ?? null,
        },
      });
      items.push(item);

      if (kind === "topic") {
        while (topicStack.length && topicStack[topicStack.length - 1].level >= currentHeading!.level) topicStack.pop();
        const key = `${kind}||${currentHeading!.normalized}`;
        topicStack.push({ level: currentHeading!.level, id: item.id, key });
      }
    });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = isHeading(line, profile);
    if (heading) {
      flush(index);
      currentHeading = heading;
      currentHeadingLine = index + 1;
      buffer = [];
      continue;
    }
    if (currentHeading) buffer.push(line.trim());
  }
  flush(lines.length);
  return items;
}

function extractNumberedObjectives(
  text: string,
  identity: CurriculumKnowledgeIdentity,
  provenance: CurriculumKnowledgeProvenance,
  pattern?: string,
): CurriculumKnowledgeItem[] {
  if (!pattern) return [];
  const regex = new RegExp(pattern);
  const lines = text.split(/\r?\n/);
  const items: CurriculumKnowledgeItem[] = [];
  let current: CurriculumKnowledgeItem | null = null;
  let startLine = 0;

  const flush = (endLine: number) => {
    if (!current) return;
    current.content = current.content.replace(/\s+/g, " ").trim();
    current.title = current.content;
    current.provenance = {
      ...current.provenance,
      sectionOrPage: current.provenance.sectionOrPage ?? `lines ${startLine}-${endLine}`,
    };
    current.metadata = {
      ...(current.metadata ?? {}),
      lineStart: startLine,
      lineEnd: endLine,
    };
    items.push(current);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const match = line.match(/^(\d+(?:\.\d+)+)\s+(.*)$/);
    if (match && regex.test(match[1])) {
      flush(index);
      startLine = index + 1;
      current = makeItem("objective", match[1], match[2], identity, provenance, items.length, {
        code: match[1],
        metadata: { extraction: "numbered-objective", lineStart: startLine },
      });
    } else if (current && line) {
      current.content += ` ${line}`;
    }
  }
  flush(lines.length);
  return items;
}

function extractPatternLines(
  text: string,
  identity: CurriculumKnowledgeIdentity,
  provenance: CurriculumKnowledgeProvenance,
  patterns: RegExp[] | undefined,
  kind: CurriculumKnowledgeKind,
): CurriculumKnowledgeItem[] {
  if (!patterns?.length) return [];
  return text.split(/\r?\n/).flatMap((line, index) => {
    const value = line.trim();
    if (!value || !patterns.some((pattern) => pattern.test(value))) return [];
    return [makeItem(kind, value.slice(0, 120), value, identity, provenance, index, {
      metadata: { extraction: "pattern", line: index + 1 },
    })];
  });
}

export function extractCurriculumKnowledge(
  text: string,
  identity: CurriculumKnowledgeIdentity,
  provenance: CurriculumKnowledgeProvenance,
  profile: CurriculumExtractionProfile = {},
): CurriculumKnowledgeItem[] {
  const sectionItems = extractSectionBlocks(text, identity, provenance, profile);
  const objectives = extractNumberedObjectives(text, identity, provenance, profile.objectiveCodePattern);
  const assessments = extractPatternLines(text, identity, provenance, profile.assessmentPatterns, "assessment_requirement");
  const papers = extractPatternLines(text, identity, provenance, profile.paperPatterns, "paper_component");

  const seen = new Set<string>();
  return [...sectionItems, ...objectives, ...assessments, ...papers].filter((item) => {
    const key = `${item.kind}:${item.code ?? ""}:${item.content.toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function groupKnowledgeByKind(items: CurriculumKnowledgeItem[]): Record<CurriculumKnowledgeKind, CurriculumKnowledgeItem[]> {
  return items.reduce((groups, item) => {
    (groups[item.kind] ??= []).push(item);
    return groups;
  }, {} as Record<CurriculumKnowledgeKind, CurriculumKnowledgeItem[]>);
}
