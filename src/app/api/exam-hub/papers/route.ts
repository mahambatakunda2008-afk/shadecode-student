import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Browse endpoint for the past-papers catalog.
 *
 * Two response shapes depending on how far the caller has drilled down —
 * this keeps the query cheap at every step even with thousands of papers,
 * instead of pulling a whole syllabus and computing distinct values client-side.
 *
 * 1) ?syllabus=9702                                 -> { facets: { levels, sessions, years } }
 * 2) ?syllabus=9702&level=..&session=..&year=2025    -> { papers: PastPaper[] }
 */
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const syllabus = searchParams.get("syllabus");
    const level = searchParams.get("level");
    const session = searchParams.get("session");
    const year = searchParams.get("year");

    if (!syllabus) {
      return NextResponse.json({ error: "syllabus is required" }, { status: 400 });
    }

    const fullyFiltered = Boolean(level && session && year);

    if (!fullyFiltered) {
      // Facet mode: cheap distinct-value lookup to drive the next filter step.
      let query = supabase
        .from("past_papers")
        .select("level, session, year")
        .eq("syllabus_id", syllabus);

      if (level) query = query.eq("level", level);
      if (session) query = query.eq("session", session);

      const { data, error } = await query;
      if (error) throw error;

      const levels = [...new Set((data ?? []).map((r) => r.level))].sort();
      const sessions = [...new Set((data ?? []).map((r) => r.session))].sort();
      const years = [...new Set((data ?? []).map((r) => r.year))].sort((a, b) => b - a);

      return NextResponse.json({ facets: { levels, sessions, years } });
    }

    // Fully filtered: return actual papers (qp/ms/in/gt) for this combination,
    // joined with the requesting user's own progress/bookmark state.
    const { data: papers, error: papersError } = await supabase
      .from("past_papers")
      .select("*")
      .eq("syllabus_id", syllabus)
      .eq("level", level)
      .eq("session", session)
      .eq("year", Number(year))
      .order("paper_number")
      .order("variant")
      .order("kind");

    if (papersError) throw papersError;

    const paperIds = (papers ?? []).map((p) => p.id);
    let stateByPaperId: Record<string, unknown> = {};

    if (paperIds.length > 0) {
      const { data: states, error: stateError } = await supabase
        .from("user_past_paper_state")
        .select("*")
        .eq("user_id", user.id)
        .in("paper_id", paperIds);

      if (stateError) throw stateError;
      stateByPaperId = Object.fromEntries((states ?? []).map((s) => [s.paper_id, s]));
    }

    const enriched = (papers ?? []).map((p) => ({
      ...p,
      state: stateByPaperId[p.id] ?? null,
    }));

    return NextResponse.json({ papers: enriched });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load papers" },
      { status: 500 }
    );
  }
}
