import type { AcademicAssessment, AcademicContext, AcademicCourse } from "@/lib/curriculum/types";

export function isPostSecondary(pathway: AcademicContext["pathway"]): boolean {
  return pathway === "university" || pathway === "tvet";
}

export function normalizeCourse(input: Partial<AcademicCourse> & Pick<AcademicCourse, "name">): AcademicCourse {
  return {
    id: input.id ?? crypto.randomUUID(),
    code: input.code?.trim() || undefined,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    credits: input.credits,
    topics: input.topics ?? [],
    assessmentTypes: input.assessmentTypes ?? ["assignment", "test", "exam"],
  };
}

export function getOpenAssessments(assessments: AcademicAssessment[], now = new Date()): AcademicAssessment[] {
  return assessments
    .filter((assessment) => !assessment.completed)
    .filter((assessment) => !assessment.dueAt || new Date(assessment.dueAt) >= now)
    .sort((a, b) => {
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
}

export function assessmentPressure(assessment: AcademicAssessment, now = new Date()): number {
  if (assessment.completed || !assessment.dueAt) return 0;
  const days = Math.max(0, (new Date(assessment.dueAt).getTime() - now.getTime()) / 86_400_000);
  const urgency = days <= 1 ? 1 : days <= 3 ? 0.8 : days <= 7 ? 0.55 : days <= 14 ? 0.3 : 0.1;
  return urgency * ((assessment.weight ?? 1) / 100 || 0.01);
}
