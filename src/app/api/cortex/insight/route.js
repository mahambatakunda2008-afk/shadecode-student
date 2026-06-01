import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function generateInsight(supabase, userId, tasks) {
  const templates = [
    "Consistency is building quietly in your workflow.",
    "Your learning pattern shows strong momentum.",
    "Small daily actions are stacking into progress.",
    "You're engaging more consistently than before.",
  ];

  const base =
    templates[Math.floor(Math.random() * templates.length)];

  return `Cortex observes: ${base}` +
    (tasks?.length
      ? ` You've recently worked on ${tasks.length} tasks.`
      : " No recent tasks found.");
}

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: insights, error } = await supabase
    .from("insights")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(insights ?? []);
}

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, completed, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const insightText = await generateInsight(
    supabase,
    user.id,
    tasks
  );

  const { data, error } = await supabase
    .from("insights")
    .insert([{ user_id: user.id, insight_text: insightText }])
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Insight generated", insight: data?.[0] },
    { status: 201 }
  );
}