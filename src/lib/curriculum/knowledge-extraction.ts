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
  cambridgeNumberedLearningOutcomes?: boolean;
}

const DEFAULT_SECTION_KINDS: Record<string, CurriculumKnowledgeKind> = {
  topics: "topic",
  "content overview": "content_scope",
  content: "content_scope",
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
  const match = cleaned.match(/^(?:(\d+(?:\.\d+)*?)[.)]?\s+)?([A-Za-z][A-Za-z ,/&'_-]{2,100})\s*:?$/);
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

function getBiologyCurriculumStage(identity: CurriculumKnowledgeIdentity, topicCode?: string | null): string | undefined {
  if (identity.boardId !== "cambridge" || identity.subjectId !== "biology" || identity.syllabusId !== "cambridge-9700" || identity.syllabusVersion !== "2028-2030" || !topicCode) return undefined;
  const number = Number(topicCode.split(".")[0]);
  if (!Number.isInteger(number) || number < 1 || number > 19) return undefined;
  return number <= 11 ? "as_level_core" : "a_level_extension";
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
    // Cambridge Biology learning outcomes are parsed below into individually
    // numbered records. Avoid emitting the whole block as one generic outcome.
    if (profile.cambridgeNumberedLearningOutcomes && currentHeading.normalized === "learning outcomes") return;
    const kind = profile.sectionKinds?.[currentHeading.normalized] ?? DEFAULT_SECTION_KINDS[currentHeading.normalized];
    if (!kind || (!content && kind !== "topic")) return;
    // Topic headings are useful draft structure even when a source extractor
    // has not attached body text yet. Keep the title as a non-empty placeholder
    // so downstream knowledge records remain valid and reviewable.
    const sectionContent = content || currentHeading.raw;
    const parent = topicStack.length ? topicStack[topicStack.length - 1] : undefined;
    const chunks = sectionContent.split(/\s*;\s*|(?<=\.)\s+(?=\d+\.\s)/).filter(Boolean);
    chunks.forEach((chunk, index) => {
      const headingTitle = currentHeading!.raw;
      const item = makeItem(kind, headingTitle, chunk.trim(), identity, {
        ...provenance,
        sectionOrPage: provenance.sectionOrPage ?? `${headingTitle} (lines ${currentHeadingLine}-${endLine})`,
      }, index, {
        parentId: parent?.id,
        metadata: {
          extraction: "section",
          section: currentHeading!.normalized,
          heading: headingTitle,
          headingLevel: currentHeading!.level,
          lineStart: currentHeadingLine,
          lineEnd: endLine,
          chunkIndex: index,
          parentKnowledgeKey: parent?.key ?? null,
          ...(kind === "topic" ? { curriculumStage: getBiologyCurriculumStage(identity, headingTitle.match(/^(\d{1,2})\s+/)?.[1]) } : {}),
          stableKey: [identity.boardId, identity.qualificationId, identity.syllabusId, identity.syllabusVersion, identity.subjectId, kind, headingTitle, chunk.trim()].join("|"),
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
      stableKey: [identity.boardId, identity.qualificationId, identity.syllabusId, identity.syllabusVersion, identity.subjectId, "objective", current.code ?? current.title].join("|"),
    };
    items.push(current);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const match = line.match(/^(\d+(?:\.\d+)+)\s+(.*)$/);
    if (match && regex.test(match[1])) {
      flush(index);
      startLine = index + 1;
      current = makeItem("objective", match[2], match[2], identity, provenance, items.length, {
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
      metadata: {
        extraction: "pattern",
        line: index + 1,
        stableKey: [identity.boardId, identity.qualificationId, identity.syllabusId, identity.syllabusVersion, identity.subjectId, kind, value].join("|"),
      },
    })];
  });
}


function extractCambridgePracticalAssessment(
  text: string,
  identity: CurriculumKnowledgeIdentity,
  provenance: CurriculumKnowledgeProvenance,
): CurriculumKnowledgeItem[] {
  const lines = text.split(/\r?\n/);
  const sections: Array<{ code: string; title: string; content: string[] }> = [];
  let current: (typeof sections)[number] | undefined;
  let collectingOverview = false;
  const overviewLines: string[] = [];
  const flush = () => {
    if (current && current.content.length) sections.push(current);
    current = undefined;
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^(?:\d+(?:\.\d+)?\s+)?Practical assessment$/i.test(line)) {
      flush();
      collectingOverview = true;
      continue;
    }
    if (/^Paper\s*3(?:\s*[–-]\s*Advanced Practical Skills)?$/i.test(line)) {
      flush();
      collectingOverview = false;
      current = { code: "P3", title: "Paper 3 – Advanced Practical Skills", content: [] };
      continue;
    }
    if (/^Paper\s*5(?:\s*[–-].*)?$/i.test(line)) {
      flush();
      collectingOverview = false;
      current = { code: "P5", title: "Paper 5 – Planning, Analysis and Evaluation", content: [] };
      continue;
    }
    if (/^Safety in the laboratory$/i.test(line)) { flush(); collectingOverview = false; continue; }
    if (current) current.content.push(line.replace(/^[•●▪–-]\s*/, ""));
    else if (collectingOverview) overviewLines.push(line.replace(/^[•●▪–-]\s*/, ""));
  }
  flush();

  const items: CurriculumKnowledgeItem[] = [];
  const overviewContent = overviewLines.join(" ").replace(/\s+/g, " ").trim();
  const overview = overviewContent
    ? makeItem(
        "practical_activity",
        "Practical assessment overview",
        overviewContent,
        identity,
        { ...provenance, sectionOrPage: provenance.sectionOrPage ?? "Practical assessment" },
        0,
        {
          code: "PRACTICAL-OVERVIEW",
          metadata: {
            extraction: "cambridge-practical-assessment-overview",
            stableKey: [identity.boardId, identity.qualificationId, identity.syllabusId, identity.syllabusVersion, identity.subjectId, "practical-assessment-overview"].join("|"),
          },
        },
      )
    : undefined;
  if (overview) items.push(overview);

  const paperSkills: Record<string, string[]> = {
    P3: [
      "manipulation, measurement and observation",
      "decisions relating to measurements and observations",
      "collection of data and observations",
      "presentation of data and observations",
      "recording data and observations",
      "display of calculation and reasoning",
      "layout of data and observations",
      "analysis, conclusions and evaluation",
      "interpreting data and observations",
      "drawing conclusions",
      "identifying sources of error and suggesting improvements",
    ],
    P5: [
      "planning",
      "defining the problem",
      "methods",
      "analysis, conclusions and evaluation",
      "dealing with data",
      "conclusions",
      "evaluation",
    ],
  };
  sections.forEach((section, index) => {
    const content = section.content.join(" ").replace(/\s+/g, " ").trim();
    const parent = makeItem(
      "assessment_requirement", section.title, content,
      identity, { ...provenance, sectionOrPage: provenance.sectionOrPage ?? section.title }, index,
      { code: section.code, metadata: {
        extraction: "cambridge-practical-assessment",
        stableKey: [identity.boardId, identity.qualificationId, identity.syllabusId, identity.syllabusVersion, identity.subjectId, "practical-assessment", section.code].join("|"),
        paper: section.code,
      }, parentId: overview?.id },
    );
    items.push(parent);

    const relevantSkills = paperSkills[section.code] ?? [];
    for (const label of relevantSkills) {
      if (!new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(content)) continue;
      items.push(makeItem(
        "skill", label[0].toUpperCase() + label.slice(1), label,
        identity, { ...provenance, sectionOrPage: section.title }, items.length,
        {
          code: `${section.code}-${label.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")}`,
          parentId: parent.id,
          metadata: {
            extraction: "cambridge-practical-skill",
            paper: section.code,
            stableKey: [identity.boardId, identity.qualificationId, identity.syllabusId, identity.syllabusVersion, identity.subjectId, "practical-skill", section.code, label].join("|"),
          },
        },
      ));
    }
  });
  return items;
}
function extractCambridgeNumberedLearningOutcomes(
  text: string,
  identity: CurriculumKnowledgeIdentity,
  provenance: CurriculumKnowledgeProvenance,
  topics: CurriculumKnowledgeItem[],
): CurriculumKnowledgeItem[] {
  const lines = text.split(/\r?\n/);
  const topicByCode = new Map<string, CurriculumKnowledgeItem>();
  for (const topic of topics) {
    const match = topic.title.match(/^(\d{1,2})\s+/);
    if (match) topicByCode.set(match[1], topic);
  }

  const items: CurriculumKnowledgeItem[] = [];
  let currentTopic: CurriculumKnowledgeItem | undefined;
  let currentSubtopic: CurriculumKnowledgeItem | undefined;
  let inLearningOutcomes = false;
  let currentOutcome: CurriculumKnowledgeItem | undefined;
  let subtopicHeading: { code: string; title: string } | undefined;

  const flushOutcome = () => {
    if (!currentOutcome) return;
    currentOutcome.content = currentOutcome.content.replace(/\s+/g, " ").trim();
    currentOutcome.title = currentOutcome.content;
    items.push(currentOutcome);
    currentOutcome = undefined;
  };
  const flushSubtopic = () => {
    flushOutcome();
    if (currentSubtopic) items.push(currentSubtopic);
    currentSubtopic = undefined;
  };
  const makeSubtopic = (code: string, title: string) => {
    flushSubtopic();
    const parentCode = code.split(".")[0];
    currentTopic = topicByCode.get(parentCode);
    currentSubtopic = makeItem("topic", title, title, identity, {
      ...provenance,
      sectionOrPage: provenance.sectionOrPage ?? `Topic ${code}`,
    }, items.length, {
      code,
      parentId: currentTopic?.id,
      metadata: {
        extraction: "cambridge-subtopic",
        stableKey: [identity.boardId, identity.qualificationId, identity.syllabusId, identity.syllabusVersion, identity.subjectId, "subtopic", code].join("|"),
        parentTopicCode: parentCode,
        curriculumStage: currentTopic?.metadata?.curriculumStage ?? getBiologyCurriculumStage(identity, parentCode),
      },
    });
    inLearningOutcomes = false;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;

    const subtopicMatch = line.match(/^(\d{1,2}\.\d{1,2})\s+(.+)$/);
    if (subtopicMatch) {
      const headingTitle = subtopicMatch[2].replace(/\s*\(continued\)$/i, "").trim();
      if (currentSubtopic?.code === subtopicMatch[1]) {
        // PDF page breaks can repeat a subtopic heading with a continued marker.
        inLearningOutcomes = false;
        continue;
      }
      makeSubtopic(subtopicMatch[1], headingTitle);
      continue;
    }

    if (!inLearningOutcomes && currentSubtopic && /^[a-z(]/.test(line) &&
        !/^(?:Candidates should be able to:|Learning outcomes)$/i.test(line) &&
        currentSubtopic.title.length < 140) {
      // Cambridge PDF text extraction sometimes wraps subtopic headings.
      currentSubtopic.title = `${currentSubtopic.title} ${line}`.replace(/\s+/g, " ").trim();
      currentSubtopic.content = currentSubtopic.title;
      continue;
    }

    if (/^Learning outcomes$/i.test(line)) {
      flushOutcome();
      inLearningOutcomes = true;
      continue;
    }

    if (inLearningOutcomes && currentSubtopic) {
      const outcomeMatch = line.match(/^(\d{1,2})\s+(.+)$/);
      if (outcomeMatch) {
        flushOutcome();
        const code = `${currentSubtopic.code}.${outcomeMatch[1]}`;
        currentOutcome = makeItem("learning_outcome", outcomeMatch[2], outcomeMatch[2], identity, {
          ...provenance,
          sectionOrPage: provenance.sectionOrPage ?? `Outcome ${code}`,
        }, items.length, {
          code,
          parentId: currentSubtopic.id,
          metadata: {
            extraction: "cambridge-numbered-learning-outcome",
            stableKey: [identity.boardId, identity.qualificationId, identity.syllabusId, identity.syllabusVersion, identity.subjectId, "learning_outcome", code].join("|"),
            topicCode: currentTopic?.code ?? currentTopic?.title.match(/^(\d{1,2})/)?.[1] ?? null,
            curriculumStage: currentTopic?.metadata?.curriculumStage ?? getBiologyCurriculumStage(identity, currentTopic?.code ?? currentTopic?.title.match(/^(\d{1,2})/)?.[1]),
          },
        });
      } else if (currentOutcome) {
        currentOutcome.content += ` ${line.replace(/^[•●▪–-]\s*/, "")}`;
      }
    }
  }

  flushSubtopic();
  return items;
}

export function extractCurriculumKnowledge(
  text: string,
  identity: CurriculumKnowledgeIdentity,
  provenance: CurriculumKnowledgeProvenance,
  profile: CurriculumExtractionProfile = {},
): CurriculumKnowledgeItem[] {
  const sectionItems = extractSectionBlocks(text, identity, provenance, profile);
  const biologyStructure = profile.cambridgeNumberedLearningOutcomes
    ? extractCambridgeNumberedLearningOutcomes(text, identity, provenance, sectionItems.filter((item) => item.kind === "topic"))
    : [];
  const practicalAssessment = profile.cambridgeNumberedLearningOutcomes
    ? extractCambridgePracticalAssessment(text, identity, provenance)
    : [];
  const objectives = extractNumberedObjectives(text, identity, provenance, profile.objectiveCodePattern);
  const assessments = extractPatternLines(text, identity, provenance, profile.assessmentPatterns, "assessment_requirement");
  const papers = extractPatternLines(text, identity, provenance, profile.paperPatterns, "paper_component");

  const seen = new Set<string>();
  return [...sectionItems, ...biologyStructure, ...practicalAssessment, ...objectives, ...assessments, ...papers].filter((item) => {
    const key = `${item.kind}:${item.code ?? ""}:${item.kind === "topic" ? item.title.toLowerCase() + ":" : ""}${item.content.toLowerCase().replace(/\s+/g, " ")}`;
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
