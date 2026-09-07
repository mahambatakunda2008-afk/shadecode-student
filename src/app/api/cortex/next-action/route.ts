import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { chooseNextAction, mapTopicMasteryRow } from "@/lib/cortex/nextAction";

export const dynamic = "force-dynamic";

/**
 * Cortex decision endpoint. It reads the durable learner state, chooses one
 * highest-value intervention, and returns the evidence behind that choice.
 * The model is deliberately not the source of truth for mastery.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: rows, error } = await supabase
      .from("topic_mastery")
      .select("subject, topic, mastery_score, retention, confidence, error_rate, prerequisite_health, recent_improvement, uncertainty, attempts, last_attempted")
      .eq("user_id", user.id)
      .order("last_attempted", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[cortex-next-action] topic state read failed:", error);
      return NextResponse.json({ error: "Failed to read learner state" }, { status: 500 });
    }

    const evidence = (rows ?? []).map((row) => mapTopicMasteryRow(row as Record<string, unknown>));
    const decision = chooseNextAction(evidence);

    return NextResponse.json({
      decision,
      observedTopics: evidence.length,
      source: "topic_mastery",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cortex-next-action] failed:", error);
    return NextResponse.json({ error: "Cortex decision failed" }, { status: 500 });
  }
}
