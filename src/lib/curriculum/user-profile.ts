import type { CurriculumIdentity } from "./objective-first";
import type { LearnerCurriculumContext } from "./resolver";

export interface StoredCurriculumIdentity extends Omit<CurriculumIdentity, "syllabusId" | "syllabusVersion"> {
  syllabusId?: string;
  syllabusVersion?: string;
  subjectName?: string;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeStoredCurriculumIdentity(value: unknown): StoredCurriculumIdentity | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const boardId = text(record.boardId);
  const qualificationId = text(record.qualificationId);
  const level = text(record.level) as CurriculumIdentity["level"] | undefined;
  const subjectId = text(record.subjectId);
  if (!boardId || !qualificationId || !level || !subjectId) return null;
  return {
    boardId,
    qualificationId,
    level,
    subjectId,
    syllabusId: text(record.syllabusId),
    syllabusVersion: text(record.syllabusVersion),
    paperOrComponentId: text(record.paperOrComponentId),
    examSession: text(record.examSession),
    subjectName: text(record.subjectName),
  };
}

export function toLearnerCurriculumContext(identity: StoredCurriculumIdentity & { syllabusId: string; syllabusVersion: string }): LearnerCurriculumContext {
  return {
    boardId: identity.boardId,
    qualificationId: identity.qualificationId,
    level: identity.level,
    syllabusId: identity.syllabusId,
    syllabusVersion: identity.syllabusVersion,
    subjectId: identity.subjectId,
    paperOrComponentId: identity.paperOrComponentId,
    examSession: identity.examSession,
  };
}

export function normalizeStoredCurriculumIdentities(value: unknown): StoredCurriculumIdentity[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeStoredCurriculumIdentity).filter((item): item is StoredCurriculumIdentity => item !== null);
}


export interface LearnerProfileGenerationHints {
  study_level?: unknown;
  education_stage?: unknown;
  curriculum_board?: unknown;
  qualification?: unknown;
  syllabus_year?: unknown;
  curriculum_profile?: unknown;
}

function profileRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function profileText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

function normalizedProfileToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function displayStudyLevel(value: string): string {
  const normalized = normalizedProfileToken(value);
  if (normalized === "aslevel") return "AS Level";
  if (normalized === "alevel") return "A Level";
  if (normalized === "olevel") return "O Level";
  if (normalized === "igcse") return "IGCSE";
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function profileSubjectAliases(subject: string): string[] {
  const key = normalizedProfileToken(subject);
  if (["mathematics", "math", "maths"].includes(key)) return ["maths", "math", "mathematics"];
  if (["computerscience", "computer", "cs"].includes(key)) return ["computer science", "computer-science", "cs"];
  if (key === "ict") return ["ict", "information technology"];
  return [subject];
}

/**
 * Build a non-authoritative teaching hint from the learner's saved profile.
 * This can tailor vocabulary and depth, but must never be represented as
 * verified syllabus evidence or used to invent exam-board requirements.
 */
export function buildLearnerProfileGenerationHints(
  profile: LearnerProfileGenerationHints | null | undefined,
  subject: string,
): { level: string; examBoard: string; promptContext: string } {
  if (!profile) return { level: "", examBoard: "", promptContext: "" };

  const curriculum = profileRecord(profile.curriculum_profile);
  const board = profileText(profile.curriculum_board) || profileText(curriculum.board);
  const rawLevel = profileText(profile.education_stage) || profileText(curriculum.level) || profileText(profile.study_level);
  const level = displayStudyLevel(rawLevel);
  const qualification = profileText(profile.qualification) || profileText(curriculum.qualification);
  const syllabusYear = profileText(profile.syllabus_year) || profileText(curriculum.syllabusVersion);
  const subjectCodes = profileRecord(curriculum.subjectCodes);
  const aliases = new Set(profileSubjectAliases(subject).map(normalizedProfileToken));
  const matchedCode = Object.entries(subjectCodes).find(([key, value]) =>
    aliases.has(normalizedProfileToken(key)) && typeof value === "string" && value.trim(),
  )?.[1];
  const code = typeof matchedCode === "string" ? matchedCode.trim() : "";

  const details = [
    board && `Board reported in learner profile: ${board}`,
    level && `Study stage reported in learner profile: ${level}`,
    qualification && `Qualification reported in learner profile: ${qualification}`,
    code && `Subject/syllabus code reported in learner profile for ${subject}: ${code}`,
    syllabusYear && `Syllabus year/version reported in learner profile: ${syllabusYear}`,
  ].filter(Boolean);

  if (!details.length) return { level: "", examBoard: "", promptContext: "" };

  return {
    level,
    examBoard: board,
    promptContext: [
      "LEARNER-REPORTED CURRICULUM PROFILE (NOT VERIFIED SYLLABUS EVIDENCE)",
      ...details.map(item => `- ${item}`),
      "- Use this information only to pitch terminology, prerequisite depth and examples to the learner's reported study stage.",
      "- Do not claim that a topic, method, notation, paper, mark allocation or learning objective is required by this board or syllabus.",
      "- If the requested topic may be outside the reported level, distinguish core level-appropriate teaching from clearly labelled extension material.",
      "- Exact syllabus identity and current syllabus version have not been verified unless a separate verified curriculum context is supplied.",
    ].join("\n"),
  };
}
