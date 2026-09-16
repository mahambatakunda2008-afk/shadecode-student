import type { SupabaseClient } from "@supabase/supabase-js";
import { isGeneralSubject, matchAllowedSubject, normalizeSubjectNames } from "./subjectContract";

export type SubjectAccessResult =
  | { ok: true; subject: string; subjectId: string }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string };

/**
 * Single server-side subject contract for learner-facing modules.
 * A subject is valid only when it is present in the learner's profile subjects.
 * "General" is never an academic subject for an onboarded learner.
 */
export async function resolveLearnerSubject(
  supabase: SupabaseClient,
  userId: string,
  requestedSubject: unknown,
  requestedSubjectId?: unknown,
): Promise<SubjectAccessResult> {
  const requestedName = typeof requestedSubject === "string" ? requestedSubject.trim() : "";
  if (!requestedName) return { ok: false, status: 400, error: "Choose a subject." };
  if (isGeneralSubject(requestedName)) {
    return { ok: false, status: 403, error: "General is not a learner subject. Choose one of your configured subjects." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subjects, onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500 as 500, error: "Could not verify your academic subjects." };
  }

  const allowed = normalizeSubjectNames(profile?.subjects);
  if (!allowed.length) {
    return {
      ok: false,
      status: 409,
      error: profile?.onboarding_completed
        ? "Your academic subjects are missing. Update onboarding before using this learning module."
        : "Complete onboarding and choose your subjects before using this learning module.",
    };
  }

  const subject = matchAllowedSubject(requestedName, allowed);
  if (!subject) {
    return { ok: false, status: 403, error: `"${requestedName}" is not one of your configured subjects.` };
  }

  const requestedId = typeof requestedSubjectId === "string" ? requestedSubjectId.trim() : "";
  if (requestedId) {
    const { data: row, error } = await supabase
      .from("subjects")
      .select("id,name")
      .eq("id", requestedId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return { ok: false, status: 500 as 500, error: "Could not verify the selected subject." };
    if (!row || !matchAllowedSubject(row.name, allowed) || matchAllowedSubject(row.name, allowed) !== subject) {
      return { ok: false, status: 403, error: "The selected subject is not available for this learner." };
    }
    return { ok: true, subject, subjectId: row.id };
  }

  const { data: existing, error: lookupError } = await supabase
    .from("subjects")
    .select("id,name")
    .eq("user_id", userId)
    .ilike("name", subject)
    .maybeSingle();

  if (lookupError) return { ok: false, status: 500 as 500, error: "Could not resolve the selected subject." };
  if (existing?.id) return { ok: true, subject, subjectId: existing.id };

  const { data: created, error: createError } = await supabase
    .from("subjects")
    .insert({ user_id: userId, name: subject })
    .select("id")
    .single();

  if (createError || !created?.id) {
    return { ok: false, status: 500 as 500, error: "The selected subject could not be registered." };
  }

  return { ok: true, subject, subjectId: created.id };
}
