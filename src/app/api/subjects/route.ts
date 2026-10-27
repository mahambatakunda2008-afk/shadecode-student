import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSubjectNames, normalizeSubjectKey } from "@/lib/academic/subjectContract";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null) as { subject?: unknown } | null;
    const requested = typeof body?.subject === "string" ? body.subject.trim().replace(/\s+/g, " ") : "";
    if (!requested || requested.length > 80 || !/[\p{L}\p{N}]/u.test(requested)) {
      return NextResponse.json({ error: "Enter a valid subject name (1–80 characters)." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("subjects").eq("id", user.id).maybeSingle();
    if (profileError) return NextResponse.json({ error: "Could not load your learner profile." }, { status: 500 });
    const current = normalizeSubjectNames(profile?.subjects);
    const existing = current.find(name => normalizeSubjectKey(name) === normalizeSubjectKey(requested));
    const subjectName = existing ?? requested;
    const nextSubjects = existing ? current : [...current, subjectName];

    if (!existing) {
      const { error: saveProfileError } = await supabase.from("profiles").upsert({ id: user.id, subjects: nextSubjects }, { onConflict: "id" });
      if (saveProfileError) return NextResponse.json({ error: "Could not save this subject to your profile." }, { status: 500 });

      const { data: subjectRows, error: subjectReadError } = await supabase.from("subjects").select("id, name").eq("user_id", user.id);
      if (subjectReadError) return NextResponse.json({ error: "Subject saved to your profile, but the learning list could not be refreshed." }, { status: 500 });
      const matchingRow = (subjectRows ?? []).find((row: { name: string }) => normalizeSubjectKey(row.name) === normalizeSubjectKey(subjectName));
      if (!matchingRow) {
        const { error: insertError } = await supabase.from("subjects").insert({ user_id: user.id, name: subjectName });
        if (insertError) return NextResponse.json({ error: "Subject saved to your profile, but its learning workspace could not be created." }, { status: 500 });
      }
    }
    return NextResponse.json({ success: true, subject: subjectName, subjects: nextSubjects });
  } catch (error) {
    console.error("[subjects] add failed", error);
    return NextResponse.json({ error: "Unable to add this subject right now." }, { status: 500 });
  }
}
