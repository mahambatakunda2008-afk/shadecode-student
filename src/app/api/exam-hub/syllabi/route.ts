import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("syllabi")
      .select("id, subject, board, levels")
      .order("subject");

    if (error) throw error;

    let syllabi = data ?? [];

    // ?scope=browse: filter which boards show, based on where the request
    // is coming from. Only the student browse page opts into this --
    // admin (managing the catalog) and contribute (submitting for any
    // board) intentionally see everything regardless of their own location.
    const { searchParams } = new URL(request.url);
    if (searchParams.get("scope") === "browse") {
      const country =
        request.headers.get("x-vercel-ip-country") ??
        request.headers.get("cf-ipcountry") ??
        null;

      const { data: boards, error: boardsError } = await supabase
        .from("exam_boards")
        .select("id, is_global, countries");

      if (boardsError) throw boardsError;

      // If we can't detect a country, or a board isn't in exam_boards at
      // all (e.g. it hasn't been classified yet), fail open rather than
      // silently hiding content -- a detection gap shouldn't mean a
      // student sees nothing.
      const visibleBoardIds = new Set(
        (boards ?? [])
          .filter((b) => b.is_global || !country || b.countries.includes(country))
          .map((b) => b.id)
      );
      const classifiedBoardIds = new Set((boards ?? []).map((b) => b.id));

      syllabi = syllabi.filter(
        (s) => !classifiedBoardIds.has(s.board) || visibleBoardIds.has(s.board)
      );
    }

    return NextResponse.json({ syllabi });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load syllabi" },
      { status: 500 }
    );
  }
}
