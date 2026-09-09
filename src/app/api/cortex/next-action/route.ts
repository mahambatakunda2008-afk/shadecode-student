import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { chooseNextAction, mapTopicMasteryRow } from "@/lib/cortex/nextAction";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: rows, error } = await supabase.from("topic_mastery").select("subject, topic, mastery_score, retention, confidence, error_rate, prerequisite_health, recent_improvement, uncertainty, attempts, last_attempted").eq("user_id", user.id).order("last_attempted", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: "Failed to read learner state" }, { status: 500 });
    const evidence = (rows ?? []).map(row => mapTopicMasteryRow(row as Record<string, unknown>));
    return NextResponse.json({ decision: chooseNextAction(evidence), observedTopics: evidence.length, source: "topic_mastery", generatedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ error: "Cortex decision failed" }, { status: 500 });
  }
}
