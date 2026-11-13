/**
 * Evidence and rights gate for material used to build Cortex Verify marking rubrics.
 * Discovering a web page never grants permission to copy, transform, cache or redistribute it.
 */
export type MarkingResourceKind =
  | "official_mark_scheme"
  | "examiner_report"
  | "candidate_response"
  | "syllabus"
  | "open_educational_resource"
  | "textbook"
  | "teacher_notes"
  | "teacher_authored_scheme"
  | "student_contribution"
  | "worked_example"
  | "question_bank"
  | "other";

export type MarkingResourceAccess =
  | "public_web"
  | "authenticated_portal"
  | "user_upload"
  | "teacher_upload"
  | "licensed_feed"
  | "open_repository"
  | "community_contribution";

export type MarkingResourceReuse =
  | "link_only"
  | "personal_study"
  | "institution_internal"
  | "open_license"
  | "explicit_permission"
  | "unknown";

export type MarkingResourceReview = "discovered" | "retrieved" | "extracted" | "reviewed" | "verified" | "rejected";

export interface MarkingResourceEvidence {
  id: string;
  title: string;
  kind: MarkingResourceKind;
  access: MarkingResourceAccess;
  reuse: MarkingResourceReuse;
  review: MarkingResourceReview;
  authority: string;
  sourceUrl?: string;
  sourceDocument?: string;
  retrievedAt?: string;
  contentSha256?: string;
  syllabusIdentity: {
    boardId: string;
    qualificationId: string;
    level: string;
    subjectId: string;
    syllabusId: string;
    syllabusVersion: string;
    examYear?: number;
    paperComponentId?: string;
  };
  attribution?: string;
  reviewerId?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface ResourceUseDecision {
  allowed: boolean;
  reason: string;
  mode: "reference_link" | "private_offline" | "institutional" | "redistribute" | "blocked";
}

/** External links can be surfaced without copying their contents into Shadecode. */
export function assessMarkingResourceUse(
  resource: MarkingResourceEvidence,
  purpose: "reference" | "private_offline" | "institutional" | "redistribute",
): ResourceUseDecision {
  if (resource.review === "rejected") return { allowed: false, mode: "blocked", reason: "This source was rejected during review." };
  if (purpose === "reference") {
    if (!resource.sourceUrl) return { allowed: false, mode: "blocked", reason: "A navigable source URL is required." };
    return { allowed: true, mode: "reference_link", reason: "The student can open the original source; no source content is copied." };
  }
  if (resource.reuse === "link_only" || resource.reuse === "unknown") {
    return { allowed: false, mode: "blocked", reason: "Reuse permission is absent. Keep this as an external reference only until permission is established." };
  }
  if (!["reviewed", "verified"].includes(resource.review)) {
    return { allowed: false, mode: "blocked", reason: "The resource must be reviewed before it can supply marking content." };
  }
  if (purpose === "private_offline") {
    const permitted = resource.reuse === "personal_study" || resource.reuse === "institution_internal" ||
      resource.reuse === "open_license" || resource.reuse === "explicit_permission";
    return permitted
      ? { allowed: true, mode: "private_offline", reason: "Reviewed material may be used in the permitted private study scope; keep it account-scoped and do not redistribute." }
      : { allowed: false, mode: "blocked", reason: "This source is not cleared for private offline reuse." };
  }
  if (purpose === "institutional") {
    const permitted = resource.reuse === "institution_internal" || resource.reuse === "open_license" || resource.reuse === "explicit_permission";
    return permitted
      ? { allowed: true, mode: "institutional", reason: "Reviewed material may be used within the permitted institution scope." }
      : { allowed: false, mode: "blocked", reason: "This source is not cleared for institutional reuse." };
  }
  const permitted = resource.reuse === "open_license" || resource.reuse === "explicit_permission";
  return permitted
    ? { allowed: true, mode: "redistribute", reason: "Redistribution is permitted subject to the recorded licence or permission conditions and attribution." }
    : { allowed: false, mode: "blocked", reason: "Public redistribution requires an open licence or explicit permission." };
}

export interface CuratedMarkingCriterion {
  id: string;
  description: string;
  marks: number;
  acceptedAnswers: string[];
}

export interface CuratedMarkingRubric {
  version: 1;
  criteria: CuratedMarkingCriterion[];
  totalMarks: number;
  sourceEvidenceId: string;
  syllabusIdentity: MarkingResourceEvidence["syllabusIdentity"];
  reviewerId: string;
  reviewedAt: string;
  limitations: string[];
}

/** Only reviewed, rights-cleared, version-bound resources can create a candidate rubric. */
export function validateCuratedMarkingRubric(
  rubric: CuratedMarkingRubric,
  resource: MarkingResourceEvidence,
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (rubric.version !== 1) reasons.push("Unsupported rubric version.");
  if (!rubric.criteria.length) reasons.push("At least one marking criterion is required.");
  if (!Number.isFinite(rubric.totalMarks) || rubric.totalMarks <= 0) reasons.push("Total marks must be positive.");
  if (rubric.criteria.some(item => !item.id.trim() || !item.description.trim() ||
    !Number.isFinite(item.marks) || item.marks <= 0 || !item.acceptedAnswers.length ||
    item.acceptedAnswers.some(answer => !answer.trim()))) reasons.push("Every criterion needs a description, positive marks and approved answer phrases.");
  const sum = rubric.criteria.reduce((total, item) => total + item.marks, 0);
  if (Math.abs(sum - rubric.totalMarks) > 1e-8) reasons.push("Criterion marks must sum exactly to total marks.");
  if (rubric.sourceEvidenceId !== resource.id) reasons.push("Rubric source evidence ID does not match the supplied resource.");
  if (JSON.stringify(rubric.syllabusIdentity) !== JSON.stringify(resource.syllabusIdentity)) reasons.push("Rubric and source syllabus identities differ.");
  if (!rubric.reviewerId.trim() || !rubric.reviewedAt.trim()) reasons.push("A named reviewer and review timestamp are required.");
  if (!rubric.limitations.length || rubric.limitations.some(item => !item.trim())) reasons.push("Explicit limitations are required.");
  const rights = assessMarkingResourceUse(resource, "private_offline");
  if (!rights.allowed) reasons.push(rights.reason);
  if (resource.review !== "verified") reasons.push("A source must reach verified status before its rubric can be used by the offline marker.");
  return { valid: reasons.length === 0, reasons };
}
