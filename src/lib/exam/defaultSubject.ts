import { isGeneralSubject, matchAllowedSubject } from "@/lib/academic/subjectContract";

/**
 * The subject an exam room should start on when none was requested: the
 * learner's own first real subject (never a placeholder like "General").
 * Returns "" when there is nothing trustworthy to default to, in which case
 * the student simply picks one as before.
 */
export function defaultExamSubject(profileSubjects: unknown): string {
  if (!Array.isArray(profileSubjects)) return "";
  const own = profileSubjects.filter((s): s is string => typeof s === "string" && s.trim().length > 0 && !isGeneralSubject(s));
  if (!own.length) return "";
  return matchAllowedSubject(own[0], profileSubjects) ?? "";
}
