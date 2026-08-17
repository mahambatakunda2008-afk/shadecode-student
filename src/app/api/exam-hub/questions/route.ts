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

    return NextResponse.json({ questions: data ?? [], count: data?.length ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Question search failed";
    const status = message.includes("required") || message.includes("difficulty") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
