import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedSubject } from "@/lib/academic/subjectContract";
import { resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const learner = await resolveLearnerSubjects(supabase, user.id);
    if (learner.subjects.length === 0) {
      return NextResponse.json({ sources: [] });
    }

    const { data: syllabi, error: syllabusError } = await supabase
      .from("syllabi")
      .select("id, subject");
    if (syllabusError) throw syllabusError;

    const selectedSubjects = learner.subjects.map((subject) => subject.name);
    const allowedSyllabusIds = (syllabi ?? [])
      .filter((syllabus) => isAllowedSubject(syllabus.subject, selectedSubjects))
      .map((syllabus) => syllabus.id);

    if (allowedSyllabusIds.length === 0) {
      return NextResponse.json({ sources: [] });
    }

    const url = new URL(request.url);
    const board = url.searchParams.get("board");
    const syllabusId = url.searchParams.get("syllabus_id");
    const sourceKind = url.searchParams.get("source_kind");

    if (syllabusId && !allowedSyllabusIds.includes(syllabusId)) {
      return NextResponse.json(
        { error: "That syllabus is not available for your selected subjects.", code: "SUBJECT_NOT_ALLOWED" },
        { status: 403 },
      );
    }

    let query = supabase
      .from("paper_sources")
      .select("id,board,syllabus_id,title,source_url,source_kind,access_mode,rights_note,year,session,paper_number,variant,last_verified_at")
      .eq("active", true)
      .in("syllabus_id", allowedSyllabusIds)
      .order("board")
      .order("title");

    if (board) query = query.eq("board", board.slice(0, 32));
    if (syllabusId) query = query.eq("syllabus_id", syllabusId.slice(0, 32));
    if (sourceKind) query = query.eq("source_kind", sourceKind.slice(0, 32));

    const { data, error } = await query;
    if (error) {
      console.error("Paper source lookup failed:", error);
      return NextResponse.json({ error: "Unable to load paper sources" }, { status: 500 });
    }

    return NextResponse.json({ sources: data ?? [] });
  } catch (err) {
    console.error("Paper source lookup failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unable to load paper sources" },
      { status: 500 },
    );
  }
}
