import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  return NextResponse.json(insights);
}

export async function POST() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, completed, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const templates = [
    "It seems you're focusing on similar subjects lately. Consistency is key!",
    "You've completed several tasks this week. Keep up the great work!",
    "Notice a pattern in your study times? Optimising your schedule could boost productivity.",
    "Your engagement with tasks is a positive sign of active learning.",
  ];

  const insightText =
    `Cortex observes: ${templates[Math.floor(Math.random() * templates.length)]}` +
    (tasks && tasks.length > 0
      ? ` You've recently worked on ${tasks.length} tasks.`
      : " No recent tasks were found.");

  const { data, error } = await supabase
    .from("insights")
    .insert([{ user_id: user.id, insight_text: insightText }])
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Insight generated", insight: data[0] },
    { status: 201 }
  );
}