import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurriculumState } from "@/lib/curriculum";

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const state = await getCurriculumState(user.id);
    return NextResponse.json({ state });
  } catch (err) {
    console.error("[api/curriculum] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
