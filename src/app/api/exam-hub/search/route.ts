import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseSearchQuery } from "@/lib/exam-hub/searchQuery";
import { resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";
import { isAllowedSubject, normalizeSubjectKey } from "@/lib/academic/subjectContract";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    if (!q) {
      return NextResponse.json({ error: "q is required" }, { status: 400 });
    }

    const learner = await resolveLearnerSubjects(supabase, user.id);
    if (learner.subjects.length === 0) {
      return NextResponse.json(
        { error: "Choose your subjects in onboarding before using Exam Hub.", code: "SUBJECT_NOT_ALLOWED", parsed: parseSearchQuery(q), papers: [], questionMatches: [] },
        { status: 409 },
      );
    }

    const parsed = parseSearchQuery(q);
    const { data: allSyllabi, error: syllabusError } = await supabase
      .from("syllabi")
      .select("id, subject, board");
    if (syllabusError) throw syllabusError;

    // First restrict the catalog to subjects this learner actually studies.
    // Search keywords may narrow that set, but can never widen it.
    const enrolledSyllabi = (allSyllabi ?? []).filter((syllabus) =>
      isAllowedSubject(syllabus.subject, learner.subjects.map((subject) => subject.name))
    );
    const matchingSyllabi = parsed.subjectKeywords.length
      ? enrolledSyllabi.filter((syllabus) => {
          const subjectKey = normalizeSubjectKey(syllabus.subject);
          return parsed.subjectKeywords.some((keyword) => {
            const keywordKey = normalizeSubjectKey(keyword);
            return keywordKey && (subjectKey.includes(keywordKey) || keywordKey.includes(subjectKey));
          });
        })
      : enrolledSyllabi;
    const allowedSyllabusIds = matchingSyllabi.map((syllabus) => syllabus.id);

    if (allowedSyllabusIds.length === 0) {
      return NextResponse.json({ parsed, papers: [], questionMatches: [] });
    }

    let query = supabase
      .from("past_papers")
      .select("*, syllabi(subject, board)")
      .in("syllabus_id", allowedSyllabusIds)
      .limit(30);

    if (parsed.year) query = query.eq("year", parsed.year);
    if (parsed.session) query = query.eq("session", parsed.session);
    if (parsed.level) query = query.eq("level", parsed.level);
    if (parsed.paperNumber) query = query.eq("paper_number", parsed.paperNumber);
    if (parsed.variant) query = query.eq("variant", parsed.variant);

    const { data: papers, error } = await query.order("year", { ascending: false });
    if (error) throw error;

    // Apply the same enrolled-syllabus boundary to indexed question matches.
    // The inner relation filter prevents a search query from exposing another
    // subject's paper IDs even when the question text matches.
    let questionMatches: { paper_id: string; question_number: string }[] = [];
    if (parsed.keywords.length > 0) {
      const { data: questions, error: questionsError } = await supabase
        .from("exam_questions")
        .select("paper_id, question_number, past_papers!inner(syllabus_id)")
        .in("past_papers.syllabus_id", allowedSyllabusIds)
        .textSearch("question_text_search", parsed.keywords.join(" | "))
        .limit(30);
      if (questionsError) throw questionsError;
      questionMatches = (questions ?? []).map((question) => ({
        paper_id: question.paper_id,
        question_number: question.question_number,
      }));
    }

    return NextResponse.json({
      parsed,
      papers: papers ?? [],
      questionMatches,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}
