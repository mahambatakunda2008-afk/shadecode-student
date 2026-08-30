import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { user, error: authError } = await getVerifiedUser(req);
    if (!user) return NextResponse.json({ error: authError || "You need to be signed in." }, { status: 401 });

    const body = await req.json();
    const durationMinutes = Math.max(1, Math.min(120, Math.round(Number(body?.durationMinutes) || 0)));
    const mode = typeof body?.mode === "string" ? body.mode.slice(0, 40) : "Focus";
    const requestedXp = Math.max(0, Math.min(200, Math.round(Number(body?.xpEarned) || 0)));
    if (!durationMinutes) return NextResponse.json({ error: "Invalid duration." }, { status: 400 });

    const supabase = await createSupabaseServerClient();
    const xpEarned = mode === "Short Break" || mode === "Long Break" ? 0 : requestedXp;

    const { error: sessionError } = await supabase.from("focus_sessions").insert({
      user_id: user.id,
      duration_minutes: durationMinutes,
      xp_earned: xpEarned,
      mode,
    });
    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

    if (xpEarned > 0) {
      const { data: profile, error: profileError } = await supabase.from("profiles").select("xp, level").eq("id", user.id).single();
      if (profileError) return NextResponse.json({ ok: true, persisted: true, xpAwarded: 0, warning: "Session saved; XP could not be updated." });
      const newXp = Math.max(0, Number(profile?.xp) || 0) + xpEarned;
      const newLevel = Math.floor(newXp / 100) + 1;
      const { error: xpError } = await supabase.from("profiles").update({ xp: newXp, level: newLevel }).eq("id", user.id);
      if (xpError) return NextResponse.json({ ok: true, persisted: true, xpAwarded: 0, warning: "Session saved; XP could not be updated." });
    }

    return NextResponse.json({ ok: true, persisted: true, xpAwarded: xpEarned });
  } catch (error) {
    console.error("[focus/complete]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save focus session." }, { status: 500 });
  }
}
