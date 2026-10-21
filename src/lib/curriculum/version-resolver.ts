/**
 * Exam-year-aware syllabus selection.
 *
 * This pure resolver deliberately does not query Supabase or infer curriculum
 * completeness. Callers must supply explicit version metadata and must only
 * publish a selected pack when the result is "resolved".
 *
 * A missing, overlapping, incomplete, or unverified version is a hard stop.
 * There is no "latest version" fallback and no mutation of older packs.
 */

export interface CurriculumVersionCandidate {
  id: string;
  boardId: string;
  qualificationId: string;
  subjectId: string;
  /** Optional route within a qualification, e.g. a documented subject route. */
  routeId?: string | null;
  /** Inclusive first exam year for which this version applies. */
  examYearStart: number;
  /** Inclusive last exam year for which this version applies. */
  examYearEnd: number;
  /** Explicit trust gates. Never infer these from item counts. */
  complete: boolean;
  verified: boolean;
}

export interface CurriculumVersionRequest {
  boardId: string;
  qualificationId: string;
  subjectId: string;
  examYear: number;
  /** If a route is required, it must match exactly. */
  routeId?: string | null;
}

export type CurriculumVersionResolution =
  | { status: "resolved"; version: CurriculumVersionCandidate }
  | { status: "invalid_request"; reason: string }
  | { status: "not_found"; reason: string }
  | { status: "ambiguous"; reason: string; candidateIds: string[] }
  | {
      status: "not_verified";
      reason: string;
      candidateId: string;
      complete: boolean;
      verified: boolean;
    };

function normalizeId(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function isValidYear(value: number): boolean {
  return Number.isInteger(value) && value >= 1900 && value <= 2200;
}

/**
 * Resolve one exact curriculum identity for a requested exam year.
 *
 * Route identity is exact: omitting a route does not silently select a routed
 * pack, and supplying a route does not fall back to a route-less pack.
 */
export function resolveCurriculumVersion(
  request: CurriculumVersionRequest,
  candidates: readonly CurriculumVersionCandidate[],
): CurriculumVersionResolution {
  if (
    !normalizeId(request.boardId) ||
    !normalizeId(request.qualificationId) ||
    !normalizeId(request.subjectId)
  ) {
    return {
      status: "invalid_request",
      reason: "Board, qualification, and subject are required.",
    };
  }

  if (!isValidYear(request.examYear)) {
    return {
      status: "invalid_request",
      reason: "Exam year must be a whole year between 1900 and 2200.",
    };
  }

  const requestedRoute = normalizeId(request.routeId);
  const matches = candidates.filter((candidate) => {
    return (
      normalizeId(candidate.boardId) === normalizeId(request.boardId) &&
      normalizeId(candidate.qualificationId) === normalizeId(request.qualificationId) &&
      normalizeId(candidate.subjectId) === normalizeId(request.subjectId) &&
      normalizeId(candidate.routeId) === requestedRoute &&
      Number.isInteger(candidate.examYearStart) &&
      Number.isInteger(candidate.examYearEnd) &&
      candidate.examYearStart <= request.examYear &&
      request.examYear <= candidate.examYearEnd
    );
  });

  if (matches.length === 0) {
    return {
      status: "not_found",
      reason: "No syllabus version matches this board, qualification, subject, route, and exam year.",
    };
  }

  if (matches.length > 1) {
    return {
      status: "ambiguous",
      reason: "More than one syllabus version matches this exact identity and exam year.",
      candidateIds: matches.map((candidate) => candidate.id),
    };
  }

  const candidate = matches[0];
  if (!candidate.complete || !candidate.verified) {
    return {
      status: "not_verified",
      reason: "A matching version exists, but it is not both complete and verified for student-facing syllabus claims.",
      candidateId: candidate.id,
      complete: candidate.complete,
      verified: candidate.verified,
    };
  }

  return { status: "resolved", version: candidate };
}
