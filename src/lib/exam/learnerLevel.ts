/**
 * A learner's exam level, in the engine's terms: easy = O-Level (Forms 1-4), medium = A-Level (Forms 5-6),
 * hard = University. `education_stage` ("form 4", "as level", "a2 level") is the precise field. `study_level`
 * is only a fallback and is ambiguous for "upper-secondary" (real data: Form 6 is stored as upper-secondary),
 * so it is never guessed; null means "do not filter" and callers keep their previous behaviour.
 */
export type LearnerDifficulty = "easy" | "medium" | "hard";

export interface LearnerStage {
  educationStage?: string | null;
  studyLevel?: string | null;
}

export function learnerDifficulty({ educationStage, studyLevel }: LearnerStage): LearnerDifficulty | null {
  const stage = (educationStage ?? "").toLowerCase().trim();
  if (stage) {
    // A-Level wording first: "a level" must not be mistaken for an O-Level.
    if (/form\s*[56]\b|\bas\s*level\b|\ba2\b|\ba[\s-]*level\b|\b(?:lower|upper)\s*sixth\b|\bsixth\s*form\b/.test(stage) || /^as\b/.test(stage)) return "medium";
    if (/form\s*[1-4]\b|\bo[\s-]*level\b|\bigcse\b|\bordinary\s*level\b|\bjunior\s*secondary\b/.test(stage)) return "easy";
    if (/university|undergraduate|bachelor|\bdegree\b|\bcollege\b/.test(stage)) return "hard";
  }
  switch (studyLevel) {
    case "early-childhood":
    case "primary":
    case "lower-secondary":
      return "easy";
    case "a-level":
      return "medium";
    case "university":
      return "hard";
    default:
      return null;
  }
}

interface StageClient {
  from(table: "profiles"): {
    select(columns: string): { eq(column: string, value: string): { maybeSingle(): PromiseLike<{ data: unknown }> } };
  };
}

/** Server-side lookup. Any failure returns null so a lookup problem never blocks practice. */
export async function fetchLearnerDifficulty(client: unknown, userId: string): Promise<LearnerDifficulty | null> {
  try {
    const { data } = await (client as StageClient).from("profiles").select("education_stage, study_level").eq("id", userId).maybeSingle();
    const row = (data ?? {}) as { education_stage?: string | null; study_level?: string | null };
    return learnerDifficulty({ educationStage: row.education_stage, studyLevel: row.study_level });
  } catch {
    return null;
  }
}
