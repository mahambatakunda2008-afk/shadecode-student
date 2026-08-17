export const ACADEMIC_PATHWAYS = ["university", "tvet"] as const;
export type AcademicPathway = (typeof ACADEMIC_PATHWAYS)[number];

export interface AcademicContextInput {
  pathway: unknown;
  institution?: unknown;
  programme?: unknown;
  year_level?: unknown;
  semester?: unknown;
  courses?: unknown;
}

export interface NormalizedAcademicContext {
  pathway: AcademicPathway;
  institution: string | null;
  programme: string;
  year_level: string | null;
  semester: string | null;
  courses: string[];
}

function boundedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function normalizeAcademicContext(input: AcademicContextInput): NormalizedAcademicContext {
  if (typeof input.pathway !== "string" || !ACADEMIC_PATHWAYS.includes(input.pathway as AcademicPathway)) {
    throw new Error("pathway must be university or tvet");
  }

  const programme = boundedString(input.programme, 200);
  if (!programme) throw new Error("programme is required");

  const courses = Array.isArray(input.courses)
    ? input.courses
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, 30)
    : [];

  return {
    pathway: input.pathway,
    institution: boundedString(input.institution, 200),
    programme,
    year_level: boundedString(input.year_level, 80),
    semester: boundedString(input.semester, 80),
    courses,
  };
}
