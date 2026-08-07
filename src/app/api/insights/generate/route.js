import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const defaultInsight =
    "Cortex observed you are actively using Shadecode Student! Keep going.";

  const { data, error } = await supabase
    .from("cortex_insights")
    .insert([
      {
        user_id: user.id,
        insight: defaultInsight,
      },
    ])
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Insight generated successfully",
    insight: data?.[0],
  });
}