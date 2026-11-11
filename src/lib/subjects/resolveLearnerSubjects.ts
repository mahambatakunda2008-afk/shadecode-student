import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalSubjectId, resolveSubjectCatalogEntry } from "@/lib/subjects/catalog";

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

function uniqueCanonical(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const id = canonicalSubjectId(value);
    if (!id || id === GENERAL || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

/**
 * Resolve learner selections against the per-user subject rows.
 *
 * profiles.subjects is the source of truth. Values may be historical display
 * names, aliases, or stable catalogue IDs (the native client writes IDs).
 * public.subjects is the per-user row set synchronized from that profile.
 * The resolver normalizes all three forms to one canonical subject ID.
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
  const catalogById = new Map<string, { id: string; name: string }>();
  for (const subject of catalogRows) {
    if (!subject.name || canonicalSubjectId(subject.name) === GENERAL) continue;
    const id = canonicalSubjectId(subject.name);
    if (!catalogById.has(id)) catalogById.set(id, { id: subject.id, name: subject.name });
  }

  // Only expose rows that correspond to the learner's canonical profile
  // selections. Historical labels and native stable IDs resolve identically.
  const subjects = canonical
    .map((id) => {
      const stored = catalogById.get(id);
      if (!stored) return null;
      const entry = resolveSubjectCatalogEntry(id);
      return { id: stored.id, name: entry?.name ?? stored.name };
    })
    .filter((subject): subject is LearnerSubject => Boolean(subject));

  return { subjects, onboardingComplete };
}

export function assertRequestedLearnerSubject(
  subjects: LearnerSubject[],
  requestedSubject?: string | null,
) {
  const requested = canonicalSubjectId(requestedSubject ?? "");
  if (!requested || requested === "all" || requested === GENERAL) return null;
  return subjects.find((subject) => canonicalSubjectId(subject.name) === requested) ?? null;
}
