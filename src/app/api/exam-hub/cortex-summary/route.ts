import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("cortex_memory")
      .select("weak_subjects, strong_subjects, exam_scores, average_exam_score, last_study_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      summary: data ?? {
        weak_subjects: [],
        strong_subjects: [],
        exam_scores: [],
        average_exam_score: 0,
        last_study_date: null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load summary" },
      { status: 500 }
    );
  }
}
