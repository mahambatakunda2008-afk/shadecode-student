import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { normalizeSubjectNames, normalizeSubjectKey } from "@/lib/academic/subjectContract";
import { SUBJECT_CATALOG } from "@/lib/subjects/catalog";

export const dynamic = "force-dynamic";

function canonicalSubjectName(value: string): string {
  const key = normalizeSubjectKey(value);
  const match = SUBJECT_CATALOG.find(entry =>
    [entry.id, entry.name, ...(entry.aliases ?? [])].some(label => normalizeSubjectKey(label) === key)
  );
  return match?.name ?? value.trim().replace(/\s+/g, " ");
}

function subjectMatches(a: string, b: string): boolean {
  return normalizeSubjectKey(canonicalSubjectName(a)) === normalizeSubjectKey(canonicalSubjectName(b));
}

async function getAuthenticatedUser(request: NextRequest) {
  // Browser and native clients may authenticate with an explicit bearer token.
  // Honour it for both identity verification and RLS-protected database queries;
  // otherwise fall back to the server-managed Supabase session cookies.
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (bearer && url && anonKey) {
    const supabase = createSupabaseClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data: { user }, error } = await supabase.auth.getUser(bearer);
    return { supabase, user: error ? null : user };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null) as { subject?: unknown } | null;
    const raw = typeof body?.subject === "string" ? body.subject.trim().replace(/\s+/g, " ") : "";
    if (!raw || raw.length > 80 || !/[\p{L}\p{N}]/u.test(raw)) {
      return NextResponse.json({ error: "Enter a valid subject name (1–80 characters)." }, { status: 400 });
    }

    const requested = canonicalSubjectName(raw);
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("subjects").eq("id", user.id).maybeSingle();
    if (profileError) return NextResponse.json({ error: "Could not load your learner profile." }, { status: 500 });
    if (!profile) return NextResponse.json({ error: "Your learner profile is not ready yet. Finish onboarding first." }, { status: 409 });

    const before = normalizeSubjectNames(profile.subjects);
    const existing = before.find(name => subjectMatches(name, requested));

    // The database function locks the profile row and performs the mutation atomically,
    // so simultaneous requests cannot silently overwrite each other's subject changes.
    const { data, error: saveError } = await supabase.rpc("mutate_my_profile_subjects", {
      p_action: "add",
      p_subject: requested,
    });
    if (saveError || !Array.isArray(data)) {
      console.error("[subjects] atomic profile update failed", saveError);
      return NextResponse.json({ error: "Could not save this subject to your profile." }, { status: 500 });
    }

    const subjects = normalizeSubjectNames(data);
    const resolved = subjects.find(name => subjectMatches(name, requested)) ?? requested;
    return NextResponse.json({ success: true, subject: existing ?? resolved, subjects });
  } catch (error) {
    console.error("[subjects] add failed", error);
    return NextResponse.json({ error: "Unable to add this subject right now." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null) as { subjectId?: unknown } | null;
    const subjectId = typeof body?.subjectId === "string" ? body.subjectId.trim() : "";
    if (!subjectId || subjectId.length > 100) {
      return NextResponse.json({ error: "Choose a valid subject to remove." }, { status: 400 });
    }

    const { data: subject, error: subjectError } = await supabase
      .from("subjects").select("id, name").eq("id", subjectId).eq("user_id", user.id).maybeSingle();
    if (subjectError) return NextResponse.json({ error: "Could not load this subject." }, { status: 500 });
    if (!subject) return NextResponse.json({ error: "Subject not found in your study space." }, { status: 404 });

    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("subjects").eq("id", user.id).maybeSingle();
    if (profileError || !profile) return NextResponse.json({ error: "Could not load your learner profile." }, { status: 500 });

    const before = normalizeSubjectNames(profile.subjects);
    if (!before.some(value => subjectMatches(value, subject.name))) {
      return NextResponse.json({ error: "This subject is not in your active profile selection." }, { status: 409 });
    }

    // Keep the catalogue row so lessons and tasks retain their historical subject UUID.
    const { data, error: saveError } = await supabase.rpc("mutate_my_profile_subjects", {
      p_action: "remove",
      p_subject: canonicalSubjectName(subject.name),
    });
    if (saveError || !Array.isArray(data)) {
      console.error("[subjects] atomic profile removal failed", saveError);
      return NextResponse.json({ error: "Could not remove this subject. Your data has not been deleted." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      removed: subject.name,
      subjects: normalizeSubjectNames(data),
    });
  } catch (error) {
    console.error("[subjects] remove failed", error);
    return NextResponse.json({ error: "Unable to remove this subject right now." }, { status: 500 });
  }
}
