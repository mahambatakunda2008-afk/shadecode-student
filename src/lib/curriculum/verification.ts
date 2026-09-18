import {
  CURRICULUM_COMPLETENESS_DIMENSIONS,
  evaluateCurriculumCompleteness,
  type CurriculumCompletenessDimension,
  type CurriculumCoverageCheck,
} from "./completeness";
import type { CurriculumExtraction, CurriculumKnowledgeDraft } from "./ingestion";
import type { CurriculumKnowledgeKind } from "./knowledge";

export type CurriculumManifestAssessment = {
  paper1: {
    title: string;
    marks: number;
    durationMinutes: number;
    weightingPercent: number;
    topics: readonly string[];
    calculators: boolean;
    externallyAssessed: boolean;
  };
  paper2: {
    title: string;
    marks: number;
    durationMinutes: number;
    weightingPercent: number;
    topics: readonly string[];
    calculators: boolean;
    externallyAssessed: boolean;
  };
  assessmentObjectives: Record<string, number>;
};

export type CurriculumVerificationManifest = {
  syllabusId: string;
  syllabusVersion: string;
  officialUrl: string;
  requiredKinds: readonly CurriculumKnowledgeKind[];
  topicKeys: readonly string[];
  assessment: CurriculumManifestAssessment;
};

export type ManifestVerificationIssue = {
  code:
    | "source-url-mismatch"
    | "missing-kind"
    | "missing-topic-key"
    | "missing-assessment-detail";
  message: string;
};

export type ManifestVerificationResult = {
  verified: boolean;
  issues: ManifestVerificationIssue[];
  observedKinds: CurriculumKnowledgeKind[];
  observedTopicKeys: string[];
};

export type CurriculumVerificationResult = {
  complete: boolean;
  verified: boolean;
  checks: CurriculumCoverageCheck[];
  unresolved: CurriculumCompletenessDimension[];
  documentHash: string;
  knowledgeCount: number;
  manifest?: ManifestVerificationResult;
};

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function metadataString(item: CurriculumKnowledgeDraft, key: string): string {
  const value = item.metadata[key];
  return typeof value === "string" ? value : "";
}

function hasTextEvidence(text: string, expected: string | number | boolean): boolean {
  return normalise(text).includes(normalise(String(expected)));
}

function hasAssessmentMetadataEvidence(
  knowledge: CurriculumKnowledgeDraft[],
  expected: string | number | boolean,
): boolean {
  const target = String(expected).toLowerCase();
  return knowledge.some((item) => {
    const assessment = item.metadata.assessment;
    if (!assessment || typeof assessment !== "object") return false;
    return JSON.stringify(assessment).toLowerCase().includes(target);
  });
}

function hasAssessmentEvidence(
  extraction: CurriculumExtraction,
  knowledge: CurriculumKnowledgeDraft[],
  expected: string | number | boolean,
): boolean {
  return hasAssessmentMetadataEvidence(knowledge, expected) || hasTextEvidence(extraction.rawText, expected);
}

function verifyAssessmentDetail(
  extraction: CurriculumExtraction,
  knowledge: CurriculumKnowledgeDraft[],
  value: string | number | boolean,
  label: string,
  issues: ManifestVerificationIssue[],
): void {
  if (!hasAssessmentEvidence(extraction, knowledge, value)) {
    issues.push({
      code: "missing-assessment-detail",
      message: `Assessment manifest detail is not evidenced by the extracted bundle: ${label}=${String(value)}.`,
    });
  }
}

/**
 * Deterministic manifest gate for curriculum-specific production promotion.
 *
 * The manifest is authoritative for expected kinds, topic keys and assessment
 * details. Presence alone is not enough: each expected value must be evidenced
 * by extracted knowledge metadata or the authoritative extracted document text.
 */
export function verifyCurriculumManifest(
  extraction: CurriculumExtraction,
  knowledge: CurriculumKnowledgeDraft[],
  manifest: CurriculumVerificationManifest,
): ManifestVerificationResult {
  const issues: ManifestVerificationIssue[] = [];
  const observedKinds = [...new Set(knowledge.map((item) => item.kind))];
  const observedTopicKeys = [
    ...new Set(
      knowledge
        .flatMap((item) => [
          item.topicKey ?? "",
          metadataString(item, "topicKey"),
        ])
        .filter(Boolean),
    ),
  ];

  if (extraction.source.sourceUrl !== manifest.officialUrl) {
    issues.push({
      code: "source-url-mismatch",
      message: `Expected authoritative source ${manifest.officialUrl} but received ${extraction.source.sourceUrl}.`,
    });
  }

  for (const kind of manifest.requiredKinds) {
    if (!observedKinds.includes(kind)) {
      issues.push({
        code: "missing-kind",
        message: `Required knowledge kind is missing from the extracted bundle: ${kind}.`,
      });
    }
  }

  for (const topicKey of manifest.topicKeys) {
    if (!observedTopicKeys.includes(topicKey)) {
      issues.push({
        code: "missing-topic-key",
        message: `Required 0478 topic key is missing from the extracted knowledge: ${topicKey}.`,
      });
    }
  }

  const papers = [manifest.assessment.paper1, manifest.assessment.paper2];
  papers.forEach((paper, index) => {
    const paperLabel = `paper${index + 1}`;
    verifyAssessmentDetail(extraction, knowledge, paper.title, `${paperLabel}.title`, issues);
    verifyAssessmentDetail(extraction, knowledge, paper.marks, `${paperLabel}.marks`, issues);
    verifyAssessmentDetail(extraction, knowledge, paper.durationMinutes, `${paperLabel}.durationMinutes`, issues);
    verifyAssessmentDetail(extraction, knowledge, paper.weightingPercent, `${paperLabel}.weightingPercent`, issues);
    verifyAssessmentDetail(extraction, knowledge, paper.calculators, `${paperLabel}.calculators`, issues);
    verifyAssessmentDetail(extraction, knowledge, paper.externallyAssessed, `${paperLabel}.externallyAssessed`, issues);
  });

  for (const [objective, weighting] of Object.entries(manifest.assessment.assessmentObjectives)) {
    verifyAssessmentDetail(extraction, knowledge, objective, `assessmentObjectives.${objective}`, issues);
    verifyAssessmentDetail(extraction, knowledge, weighting, `assessmentObjectives.${objective}`, issues);
  }

  return {
    verified: issues.length === 0,
    issues,
    observedKinds,
    observedTopicKeys,
  };
}

/**
 * Final gate for ingestion jobs. Detection is deliberately separated from
 * verification: a parser may discover material, but only reconciled evidence
 * can mark it verified.
 */
export function verifyCurriculumBundle(
  extraction: CurriculumExtraction,
  knowledge: CurriculumKnowledgeDraft[],
  checks: CurriculumCoverageCheck[],
  manifest?: CurriculumVerificationManifest,
): CurriculumVerificationResult {
  const result = evaluateCurriculumCompleteness(checks);
  const unresolved = [...result.missing, ...result.partial, ...result.blocked];
  const manifestResult = manifest
    ? verifyCurriculumManifest(extraction, knowledge, manifest)
    : undefined;

  return {
    complete: result.complete,
    verified:
      result.complete &&
      checks.length === CURRICULUM_COMPLETENESS_DIMENSIONS.length &&
      (manifestResult?.verified ?? true),
    checks,
    unresolved,
    documentHash: extraction.documentHash,
    knowledgeCount: knowledge.length,
    manifest: manifestResult,
  };
}

export function assertProductionVerifiedCurriculum(
  result: CurriculumVerificationResult,
): void {
  if (!result.verified) {
    const manifestIssues = result.manifest?.issues.map((issue) => issue.message) ?? [];
    const reasons = [...result.unresolved.map(String), ...manifestIssues];
    throw new Error(
      `Curriculum cannot be marked production-verified. Unresolved dimensions: ${reasons.join("; ") || "none"}.`,
    );
  }
}
