export type LearnerCurriculumProfile = {
  study_level?: unknown;
  education_stage?: unknown;
  curriculum_board?: unknown;
  qualification?: unknown;
  syllabus_code?: unknown;
  syllabus_year?: unknown;
  curriculum_profile?: unknown;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function formatLevel(value: string): string {
  const normalized = normalize(value);
  if (normalized === "aslevel") return "AS Level";
  if (normalized === "alevel") return "A Level";
  if (normalized === "olevel") return "O Level";
  if (normalized === "igcse") return "IGCSE";
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function subjectAliases(subject: string): string[] {
  const key = normalize(subject);
  if (["mathematics", "math", "maths"].includes(key)) return ["maths", "math", "mathematics"];
  if (["computerscience", "computer", "cs"].includes(key)) return ["computer science", "computer-science", "cs"];
  if (key === "ict") return ["ict", "information technology"];
  return [subject];
}

/**
 * Builds a clearly labelled, non-authoritative teaching hint from the learner's
 * saved profile. It may tailor language and level, but it must never be treated
 * as verified syllabus evidence or used to invent exam-board requirements.
 */
export function buildLearnerCurriculumContext(
  profile: LearnerCurriculumProfile | null | undefined,
  subject: string,
): { level: string; examBoard: string; promptContext: string } {
  if (!profile) return { level: "", examBoard: "", promptContext: "" };

  const curriculum = record(profile.curriculum_profile);
  const board = clean(profile.curriculum_board) || clean(curriculum.board);
  const rawLevel = clean(profile.education_stage) || clean(curriculum.level) || clean(profile.study_level);
  const level = formatLevel(rawLevel);
  const qualification = clean(profile.qualification) || clean(curriculum.qualification);
  const syllabusCode = clean(profile.syllabus_code);
  const syllabusYear = clean(profile.syllabus_year) || clean(curriculum.syllabusVersion);

  const subjectCodes = record(curriculum.subjectCodes);
  const aliases = new Set(subjectAliases(subject).map(normalize));
  const matchedCode = Object.entries(subjectCodes).find(([key, value]) =>
    aliases.has(normalize(key)) && typeof value === "string" && value.trim(),
  )?.[1];
  const code = syllabusCode || (typeof matchedCode === "string" ? matchedCode.trim() : "");

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
