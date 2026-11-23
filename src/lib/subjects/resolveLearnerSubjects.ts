import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeSubjectKey } from "@/lib/academic/subjectContract";
import { SUBJECT_CATALOG } from "./catalog";

export type LearnerSubject = {
  id: string;
  name: string;
  code?: string | null;
};

type ProfileSubjects = {
  subjects: string[] | null;
  onboarding_completed?: boolean | null;
};

const GENERAL = "general";

/**
 * Convert stable profile IDs, display names and catalogue aliases to one
 * learner-facing canonical name. Profile values have historically used both
 * slugs (for example "computer-science") and display names ("Computer Science").
 */
export function canonicalizeSubjectName(value: string): string {
  const key = normalizeSubjectKey(value);
  if (!key || key === GENERAL) return "";
  const entry = SUBJECT_CATALOG.find((subject) =>
    [subject.id, subject.name, ...(subject.aliases ?? [])]
      .some((label) => normalizeSubjectKey(label) === key),
  );
  return entry?.name ?? value.trim().replace(/\s+/g, " ");
}

function uniqueCanonical(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const name = canonicalizeSubjectName(value);
    const key = normalizeSubjectKey(name);
    if (!key || key === GENERAL || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/**
 * Canonical subject resolver for learner-facing modules.
 *
 * profiles.subjects is the source of truth. public.subjects is the per-user
 * catalog synchronized from that profile. Both sides are normalized through
 * the shared subject catalogue so stable IDs, aliases and display names match.
 * This function deliberately does not invent a General subject.
 */
export async function resolveLearnerSubjects(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ subjects: LearnerSubject[]; onboardingComplete: boolean }> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subjects, onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const row = (profile ?? { subjects: null, onboarding_completed: false }) as ProfileSubjects;
  const canonical = uniqueCanonical(Array.isArray(row.subjects) ? row.subjects : []);
  const onboardingComplete = Boolean(row.onboarding_completed) || canonical.length > 0;

  const { data: catalog, error: catalogError } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (catalogError) throw catalogError;

  const catalogRows = (catalog ?? []) as Array<{ id: string; name: string | null }>;
  const catalogByName = new Map(
    catalogRows
      .filter((subject) => subject.name && normalizeSubjectKey(subject.name) !== GENERAL)
      .map((subject) => [normalizeSubjectKey(canonicalizeSubjectName(subject.name as string)), subject]),
  );

  if (canonical.length > 0) {
    const subjects = canonical
      .map((name) => catalogByName.get(normalizeSubjectKey(name)))
      .filter((subject): subject is { id: string; name: string } => Boolean(subject))
      .map((subject) => ({ id: subject.id, name: subject.name }));

    return { subjects, onboardingComplete };
  }

  return { subjects: [], onboardingComplete };
}

export function assertRequestedLearnerSubject(
  subjects: LearnerSubject[],
  requestedSubject?: string | null,
) {
  const requested = normalizeSubjectKey(canonicalizeSubjectName(requestedSubject ?? ""));
  if (!requested || requested === "all" || requested === GENERAL) return null;
  return subjects.find((subject) =>
    normalizeSubjectKey(canonicalizeSubjectName(subject.name)) === requested,
  ) ?? null;
}
