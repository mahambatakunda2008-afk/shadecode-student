import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

    const body = await request.json();
    if (typeof body?.surveyId !== "string" || !body?.answers || typeof body.answers !== "object") {
      return NextResponse.json({ error: "Invalid response" }, { status: 400 });
    }

    const { error } = await supabase.from("survey_responses").insert({
      survey_id: body.surveyId,
      user_id: user.id,
      answers: body.answers,
    });

    if (error) return NextResponse.json({ error: "Unable to save response" }, { status: 500 });

    await supabase.from("traction_events").insert({
      user_id: user.id,
      name: "survey_completed",
      path: "/",
      properties: { surveyId: body.surveyId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
