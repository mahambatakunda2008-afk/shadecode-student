import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeQuestionQuery } from "@/lib/exam/question-query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = normalizeQuestionQuery({
      q: searchParams.get("q"),
      paperId: searchParams.get("paperId"),
      topicId: searchParams.get("topicId"),
      difficulty: searchParams.get("difficulty"),
      limit: searchParams.get("limit"),
    });

    let dbQuery = supabase
      .from("exam_questions")
      .select("id,paper_id,question_number,page_number,topic_id,subtopic,difficulty,marks,question_text,created_at,past_papers(id,syllabus_id,level,session,year,paper_number,variant)")
      .limit(query.limit);

    if (query.paperId) dbQuery = dbQuery.eq("paper_id", query.paperId);
    if (query.topicId) dbQuery = dbQuery.eq("topic_id", query.topicId);
    if (query.difficulty) dbQuery = dbQuery.eq("difficulty", query.difficulty);
    if (query.q) {
      dbQuery = dbQuery.textSearch("question_text_search", query.q, { type: "websearch", config: "english" });
    }

    const { data, error } = await dbQuery.order("created_at", { ascending: false });
    if (error) throw error;

    const rows = data ?? [];
    const syllabusIds = [...new Set(rows.map((row) => {
      const paper = Array.isArray(row.past_papers) ? row.past_papers[0] : row.past_papers;
      return paper?.syllabus_id;
    }).filter((id): id is string => typeof id === "string" && id.length > 0))];

    const syllabusMap = new Map<string, { subject: string; board: string }>();
    if (syllabusIds.length) {
      const { data: syllabi, error: syllabusError } = await supabase
        .from("syllabi")
        .select("id,subject,board")
        .in("id", syllabusIds);
      if (syllabusError) throw syllabusError;
      for (const syllabus of syllabi ?? []) {
        syllabusMap.set(syllabus.id, { subject: syllabus.subject, board: syllabus.board });
      }
    }

    const questions = rows.map((row) => {
      const paper = Array.isArray(row.past_papers) ? row.past_papers[0] : row.past_papers;
      const syllabus = paper?.syllabus_id ? syllabusMap.get(paper.syllabus_id) : undefined;
      return {
        ...row,
        past_papers: paper
          ? { ...paper, subject: syllabus?.subject ?? null, board: syllabus?.board ?? null }
          : null,
      };
    });

    return NextResponse.json({ questions, count: questions.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Question search failed";
    const status = message.includes("required") || message.includes("difficulty") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
