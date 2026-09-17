import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const learner = await resolveLearnerSubjects(supabase, user.id);
    if (learner.subjects.length === 0) {
      return NextResponse.json({ syllabi: [], subjects: [], onboardingComplete: learner.onboardingComplete });
    }

    const { data, error } = await supabase
      .from("syllabi")
      .select("id, subject, board, levels")
      .order("subject");

    if (error) throw error;

    const allowedNames = new Set(learner.subjects.map((subject) => subject.name.trim().toLowerCase()));
    let syllabi = (data ?? []).filter(
      (syllabus) => typeof syllabus.subject === "string" && allowedNames.has(syllabus.subject.trim().toLowerCase())
    );

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

    return NextResponse.json({ syllabi, subjects: learner.subjects, onboardingComplete: learner.onboardingComplete });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load syllabi" },
      { status: 500 }
    );
  }
}
