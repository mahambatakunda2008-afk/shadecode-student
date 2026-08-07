import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_past_paper_state")
      .select("*, past_papers(*)")
      .eq("user_id", user.id)
      .eq("bookmarked", true)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const papers = (data ?? [])
      .filter((row) => row.past_papers)
      .map((row) => ({ ...row.past_papers, state: { ...row, past_papers: undefined } }));

    return NextResponse.json({ papers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load saved papers" },
      { status: 500 }
    );
  }
}
