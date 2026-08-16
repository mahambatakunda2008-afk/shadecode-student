import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ survey: null });

  const { data: survey } = await supabase
    .from("surveys")
    .select("id,slug,title,prompt,questions")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!survey) return NextResponse.json({ survey: null });

  const { data: response } = await supabase
    .from("survey_responses")
    .select("id")
    .eq("survey_id", survey.id)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ survey: response ? null : survey });
}
