import { createHash } from "node:crypto";

import {
  CURRICULUM_COMPLETENESS_DIMENSIONS,
  type CurriculumCompletenessDimension,
  type CurriculumCoverageCheck,
} from "./completeness";
import type { CurriculumKnowledgeKind } from "./knowledge";

export type CurriculumSourceInput = {
  authority: string;
  sourceUrl: string;
  sourceDocument?: string;
  retrievedAt?: string;
};

export type CurriculumSection = {
  id: string;
  title: string;
  level: number;
  page?: number;
  text: string;
  parentId?: string;
};

export type CurriculumExtraction = {
  source: CurriculumSourceInput;
  documentHash: string;
  pageCount?: number;
  sections: CurriculumSection[];
  rawText: string;
};

export type CurriculumKnowledgeDraft = {
  kind: CurriculumKnowledgeKind;
  knowledgeKey: string;
  title: string;
  content: string;
  parentKey?: string;
  topicKey?: string;
  objectiveKeys: string[];
  metadata: Record<string, unknown>;
  provenance: Record<string, unknown>;
};

export type CurriculumIngestionResult = {
  extraction: CurriculumExtraction;
  knowledge: CurriculumKnowledgeDraft[];
  coverage: CurriculumCoverageCheck[];
};

const DIMENSION_KINDS: Partial<Record<CurriculumCompletenessDimension, CurriculumKnowledgeKind[]>> = {
  structure: ["topic", "content_scope"],
  scope: ["content_scope"],
  content_scope: ["content_scope"],
  competencies: ["competency"],
  skills: ["skill"],
  prerequisites: ["prerequisite"],
  progression: ["progression"],
  assessment_objectives: ["assessment_requirement"],
  assessment_structure: ["assessment_requirement"],
  paper_components: ["paper_component"],
  assessment_weightings: ["assessment_weighting"],
  examination_format: ["examination_format"],
  practical_requirements: ["practical_activity"],
  project_requirements: ["project_requirement"],
  coursework_requirements: ["assessment_requirement"],
  terminology: ["terminology"],
  constraints: ["constraint"],
  guidance: ["guidance"],
  resources: ["resource"],
};

function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function normaliseText(text: string): string {
  return text.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Turns already-extracted document text into stable sections. This intentionally
 * does not pretend to understand a PDF layout. Layout-aware extraction belongs
 * at the document boundary; this layer only creates deterministic structure from
 * text that has already been extracted.
 */
export function extractCurriculumText(source: CurriculumSourceInput, rawText: string, pageCount?: number): CurriculumExtraction {
  const normalised = normaliseText(rawText);
  const lines = normalised.split("\n");
  const sections: CurriculumSection[] = [];
  let current: CurriculumSection | undefined;
  let index = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const looksLikeHeading = /^(?:\d+(?:\.\d+)*|[A-Z][A-Z\s/&-]{4,})[.)\s-]/.test(trimmed) || /^\d+(?:\.\d+)*\s+/.test(trimmed);
    if (looksLikeHeading) {
      if (current) sections.push(current);
      current = {
        id: `section-${++index}`,
        title: trimmed,
        level: (trimmed.match(/^(\d+(?:\.\d+)*)/)?.[1].split(".").length ?? 1),
        text: "",
      };
    } else if (current) {
      current.text = `${current.text}${current.text ? "\n" : ""}${trimmed}`;
    }
  }
  if (current) sections.push(current);

  return {
    source: { ...source, retrievedAt: source.retrievedAt ?? new Date().toISOString() },
    documentHash: hashText(normalised),
    pageCount,
    sections,
    rawText: normalised,
  };
}

function inferKind(section: CurriculumSection): CurriculumKnowledgeKind {
  const title = `${section.title} ${section.text}`.toLowerCase();
  if (/assessment objective|assessment criteria|learning objective/.test(title)) return "assessment_requirement";
  if (/practical|laboratory|experiment|programming exercise/.test(title)) return "practical_activity";
  if (/project/.test(title)) return "project_requirement";
  if (/paper|component|examination paper/.test(title)) return "paper_component";
  if (/weight|percentage|marks allocation/.test(title)) return "assessment_weighting";
  if (/exam(ination)? format|duration|time allowed|calculator/.test(title)) return "examination_format";
  if (/prerequisite|prior knowledge/.test(title)) return "prerequisite";
  if (/progression|sequence|builds on/.test(title)) return "progression";
  if (/competenc/.test(title)) return "competency";
  if (/skill/.test(title)) return "skill";
  if (/terminology|glossary|command words/.test(title)) return "terminology";
  if (/constraint|restriction|must not|not permitted/.test(title)) return "constraint";
  if (/guidance|teaching|teacher guidance|notes? for/.test(title)) return "guidance";
  if (/resource|recommended|support material/.test(title)) return "resource";
  if (/topic|contents|subject content|syllabus content/.test(title)) return "content_scope";
  return "topic";
}

export function buildKnowledgeDrafts(extraction: CurriculumExtraction): CurriculumKnowledgeDraft[] {
  return extraction.sections.map((section) => {
    const kind = inferKind(section);
    return {
      kind,
      knowledgeKey: `${kind}:${section.id}`,
      title: section.title,
      content: section.text,
      objectiveKeys: [],
      metadata: { level: section.level, documentHash: extraction.documentHash },
      provenance: {
        authority: extraction.source.authority,
        sourceDocument: extraction.source.sourceDocument ?? extraction.source.sourceUrl,
        sourceUrl: extraction.source.sourceUrl,
        retrievedAt: extraction.source.retrievedAt,
        sectionOrPage: section.page ? `page ${section.page}` : section.title,
        mappingStatus: "pending",
        versionSource: "document",
      },
    };
  });
}

function hasKind(knowledge: CurriculumKnowledgeDraft[], kinds: CurriculumKnowledgeKind[]): boolean {
  return knowledge.some((item) => kinds.includes(item.kind) && item.content.trim().length > 0);
}

/**
 * Produces conservative evidence. Identity, source, document, provenance and
 * objectives must be established by the caller from authoritative metadata.
 * This function never upgrades a dimension merely because a document exists.
 */
export function buildCoverageChecks(
  extraction: CurriculumExtraction,
  knowledge: CurriculumKnowledgeDraft[],
  verifiedObjectiveCount: number,
): CurriculumCoverageCheck[] {
  return CURRICULUM_COMPLETENESS_DIMENSIONS.map((dimension) => {
    if (dimension === "identity" || dimension === "source" || dimension === "provenance") {
      return { dimension, status: "partial", notes: "Must be verified against registry and authoritative source metadata." };
    }
    if (dimension === "document") {
      return {
        dimension,
        status: extraction.rawText.length > 0 ? "partial" : "missing",
        evidence: { documentHash: extraction.documentHash, pageCount: extraction.pageCount },
        notes: "Extraction exists; human/automated reconciliation must still establish full-document coverage.",
      };
    }
    if (dimension === "objectives") {
      return {
        dimension,
        status: verifiedObjectiveCount > 0 ? "partial" : "missing",
        evidence: { verifiedObjectiveCount },
        notes: "Objective verification is necessary but never sufficient for production completeness.",
      };
    }
    if (dimension === "change_history" || dimension === "past_paper_coverage" || dimension === "mark_scheme_coverage" || dimension === "examiner_report_coverage" || dimension === "grade_threshold_coverage") {
      return { dimension, status: "missing", notes: "Requires separate authoritative evidence reconciliation." };
    }
    const kinds = DIMENSION_KINDS[dimension];
    if (!kinds) return { dimension, status: "missing", notes: "No automated evidence mapping is defined yet." };
    return {
      dimension,
      status: hasKind(knowledge, kinds) ? "partial" : "missing",
      evidence: hasKind(knowledge, kinds) ? { knowledgeKinds: kinds } : undefined,
      notes: "Presence is detected automatically; production verification requires complete scope reconciliation.",
    };
  });
}

export function ingestExtractedCurriculum(
  source: CurriculumSourceInput,
  rawText: string,
  options: { pageCount?: number; verifiedObjectiveCount?: number } = {},
): CurriculumIngestionResult {
  const extraction = extractCurriculumText(source, rawText, options.pageCount);
  const knowledge = buildKnowledgeDrafts(extraction);
  const coverage = buildCoverageChecks(extraction, knowledge, options.verifiedObjectiveCount ?? 0);
  return { extraction, knowledge, coverage };
}
