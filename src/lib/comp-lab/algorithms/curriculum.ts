import type { AlgorithmContext, AlgorithmExercise, AlgorithmObjective } from "./assessment";

/**
 * Curriculum metadata is deliberately separate from the execution engine.
 * A binding is only authoritative when an external verified curriculum source
 * is attached. Board-neutral exercises must never be presented as official.
 */
export type CurriculumBinding = {
  board: string;
  qualification: string;
  level: string;
  subject: string;
  syllabusId: string;
  syllabusVersion: string;
  objectiveId: string;
  objectiveLabel: string;
  sourceReference: string;
  verified: boolean;
};

export type CompLabCurriculumContext = {
  context: AlgorithmContext;
  board?: string;
  qualification?: string;
  level?: string;
  subject?: string;
  syllabusId?: string;
  syllabusVersion?: string;
};

export type CurriculumAwareExercise = AlgorithmExercise & {
  curriculum?: CurriculumBinding[];
};

export function isVerifiedCurriculumBinding(binding: CurriculumBinding): boolean {
  return Boolean(
    binding.verified &&
      binding.board.trim() &&
      binding.qualification.trim() &&
      binding.level.trim() &&
      binding.subject.trim() &&
      binding.syllabusId.trim() &&
      binding.syllabusVersion.trim() &&
      binding.objectiveId.trim() &&
      binding.objectiveLabel.trim() &&
      binding.sourceReference.trim(),
  );
}

export function officialAlignmentLabel(binding?: CurriculumBinding): "official" | "practice" {
  return binding && isVerifiedCurriculumBinding(binding) ? "official" : "practice";
}

export function matchesCurriculumContext(
  exercise: Pick<CurriculumAwareExercise, "contexts" | "curriculum">,
  context: CompLabCurriculumContext,
): boolean {
  if (!exercise.contexts.includes(context.context)) return false;
  if (!context.board && !context.qualification && !context.level && !context.subject && !context.syllabusId) return true;

  return (exercise.curriculum ?? []).some((binding) => {
    if (!isVerifiedCurriculumBinding(binding)) return false;
    if (context.board && binding.board !== context.board) return false;
    if (context.qualification && binding.qualification !== context.qualification) return false;
    if (context.level && binding.level !== context.level) return false;
    if (context.subject && binding.subject !== context.subject) return false;
    if (context.syllabusId && binding.syllabusId !== context.syllabusId) return false;
    if (context.syllabusVersion && binding.syllabusVersion !== context.syllabusVersion) return false;
    return true;
  });
}

export function attachVerifiedCurriculumBinding(
  exercise: CurriculumAwareExercise,
  binding: CurriculumBinding,
): CurriculumAwareExercise {
  if (!isVerifiedCurriculumBinding(binding)) {
    throw new Error("Curriculum binding must contain a verified source and complete syllabus metadata.");
  }
  return { ...exercise, curriculum: [...(exercise.curriculum ?? []), binding] };
}

export function objectiveIsCurriculumCompatible(
  objective: Pick<AlgorithmObjective, "id">,
  binding: CurriculumBinding,
): boolean {
  return objective.id === binding.objectiveId;
}
