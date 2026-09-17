import type { SupabaseClient } from "@supabase/supabase-js";

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

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function unique(values: string[]) {
  return [...new Set(values.map(normalize).filter(Boolean))];
}

/**
 * Canonical subject resolver for learner-facing modules.
 *
 * profiles.subjects is the source of truth. public.subjects is the per-user
 * catalog synchronized from that profile. This function deliberately does
 * not invent a General subject when a learner has no subjects.
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
  const canonical = unique(Array.isArray(row.subjects) ? row.subjects : []);
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
      .filter((s) => s.name && normalize(s.name) !== GENERAL)
      .map((s) => [normalize(s.name as string), s]),
  );

  // Only expose catalog rows that correspond to canonical onboarding subjects
  // for onboarded users. This prevents stale/legacy subjects leaking into UI.
  if (canonical.length > 0) {
    const subjects = canonical
      .map((name) => catalogByName.get(name))
      .filter((s): s is { id: string; name: string } => Boolean(s))
      .map((s) => ({ id: s.id, name: s.name }));

    return { subjects, onboardingComplete };
  }

  // Pre-onboarding users get an empty subject list. Never silently substitute
  // General because that masks broken onboarding state and pollutes modules.
  return { subjects: [], onboardingComplete };
}

export function assertRequestedLearnerSubject(
  subjects: LearnerSubject[],
  requestedSubject?: string | null,
) {
  const requested = normalize(requestedSubject ?? "");
  if (!requested || requested === "all") return null;
  if (requested === GENERAL) return null;
  return subjects.find((s) => normalize(s.name) === requested) ?? null;
}
