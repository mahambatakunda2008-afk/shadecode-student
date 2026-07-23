import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type StatePatch = Partial<{
  bookmarked: boolean;
  status: "not_started" | "in_progress" | "completed";
  last_page: number;
  time_spent_seconds: number;
  downloaded_offline: boolean;
}>;

const ALLOWED_KEYS: (keyof StatePatch)[] = [
  "bookmarked",
  "status",
  "last_page",
  "time_spent_seconds",
  "downloaded_offline",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as StatePatch;
    const patch: Record<string, unknown> = {};
    for (const key of ALLOWED_KEYS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields in request" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_past_paper_state")
      .upsert(
        { user_id: user.id, paper_id: id, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "user_id,paper_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ state: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update paper state" },
      { status: 500 }
    );
  }
}
