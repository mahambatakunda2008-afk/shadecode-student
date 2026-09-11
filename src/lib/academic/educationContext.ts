/**
 * Shared education context for all Shadecode clients.
 *
 * This is intentionally additive. Existing secondary curriculum and
 * post-secondary AcademicContext models remain compatible while clients
 * gradually migrate to one normalized context contract.
 */

export const EDUCATION_PATHWAYS = [
  "early-childhood",
  "primary",
  "secondary",
  "university",
  "tvet",
  "college",
  "vocational",
  "professional",
] as const;

export type EducationPathway = (typeof EDUCATION_PATHWAYS)[number];

export type EducationStage =
  | "foundation"
  | "school"
  | "tertiary"
  | "professional";

export interface EducationContext {
  pathway: EducationPathway;
  stage: EducationStage;

  /** Institution, school, college, university, polytechnic, or provider. */
  institutionId?: string | null;
  institutionName?: string | null;

  /** Programme / qualification / stream. */
  programmeId?: string | null;
  programmeName?: string | null;
  qualification?: string | null;

  /** School/exam-board context where applicable. */
  examBoard?: string | null;
  syllabusId?: string | null;
  syllabusVersionId?: string | null;
  level?: string | null;

  /** Tertiary/professional context. */
  academicYear?: string | null;
  yearLevel?: string | null;
  semester?: string | null;
  term?: string | null;

  /** Course/subject identifiers are deliberately provider-neutral. */
  subjectIds: string[];
  courseIds: string[];
}

export interface EducationContextInput extends Partial<EducationContext> {
  pathway: EducationPathway;
}

const FOUNDATION_PATHWAYS = new Set<EducationPathway>([
  "early-childhood",
  "primary",
]);

const SCHOOL_PATHWAYS = new Set<EducationPathway>(["secondary"]);

const TERTIARY_PATHWAYS = new Set<EducationPathway>([
  "university",
  "tvet",
  "college",
  "vocational",
]);

export function getEducationStage(pathway: EducationPathway): EducationStage {
  if (FOUNDATION_PATHWAYS.has(pathway)) return "foundation";
  if (SCHOOL_PATHWAYS.has(pathway)) return "school";
  if (TERTIARY_PATHWAYS.has(pathway)) return "tertiary";
  return "professional";
}

export function normalizeEducationContext(
  input: EducationContextInput,
): EducationContext {
  return {
    pathway: input.pathway,
    stage: input.stage ?? getEducationStage(input.pathway),
    institutionId: input.institutionId ?? null,
    institutionName: input.institutionName?.trim() || null,
    programmeId: input.programmeId ?? null,
    programmeName: input.programmeName?.trim() || null,
    qualification: input.qualification?.trim() || null,
    examBoard: input.examBoard?.trim() || null,
    syllabusId: input.syllabusId ?? null,
    syllabusVersionId: input.syllabusVersionId ?? null,
    level: input.level?.trim() || null,
    academicYear: input.academicYear?.trim() || null,
    yearLevel: input.yearLevel?.trim() || null,
    semester: input.semester?.trim() || null,
    term: input.term?.trim() || null,
    subjectIds: [...new Set(input.subjectIds ?? [])],
    courseIds: [...new Set(input.courseIds ?? [])],
  };
}

export function isSchoolEducation(context: EducationContext): boolean {
  return context.stage === "school";
}

export function isTertiaryEducation(context: EducationContext): boolean {
  return context.stage === "tertiary";
}
