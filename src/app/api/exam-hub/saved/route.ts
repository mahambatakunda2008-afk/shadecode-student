import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";
import { isAllowedSubject } from "@/lib/academic/subjectContract";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const learner = await resolveLearnerSubjects(supabase, user.id);
    if (learner.subjects.length === 0) return NextResponse.json({ papers: [] });

    const { data: syllabi, error: syllabusError } = await supabase
      .from("syllabi")
      .select("id, subject");
    if (syllabusError) throw syllabusError;

    const allowedSyllabusIds = new Set((syllabi ?? [])
      .filter((syllabus) => isAllowedSubject(syllabus.subject, learner.subjects.map((subject) => subject.name)))
      .map((syllabus) => syllabus.id));

    const { data, error } = await supabase
      .from("user_past_paper_state")
      .select("*, past_papers(*)")
      .eq("user_id", user.id)
      .eq("bookmarked", true)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const papers = (data ?? [])
      .filter((row) => row.past_papers && allowedSyllabusIds.has(row.past_papers.syllabus_id))
      .map((row) => ({ ...row.past_papers, state: { ...row, past_papers: undefined } }));

    return NextResponse.json({ papers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load saved papers" },
      { status: 500 }
    );
  }
}
