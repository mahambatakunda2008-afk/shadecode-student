import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserRole } from "@/lib/auth/rbac";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false as const, status: 401, error: "Unauthorized" };
  if (!(await hasUserRole(user.id, "admin"))) return { ok: false as const, status: 403, error: "Admin access required" };
  return { ok: true as const, supabase, user };
}

// GET /api/admin/exam-hub/questions?paperSearch=... -> paper picker results
// GET /api/admin/exam-hub/questions?paperId=...     -> questions for that paper
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const paperId = searchParams.get("paperId");
  const paperSearch = searchParams.get("paperSearch");

  if (paperId) {
    const { data, error } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("paper_id", paperId)
      .order("question_number");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ questions: data ?? [] });
  }

  if (paperSearch !== null) {
    let query = supabase
      .from("past_papers")
      .select("id, syllabus_id, level, session, year, paper_number, variant, kind, syllabi(subject, board)")
      .eq("kind", "qp") // tag against the question paper, not the mark scheme
      .order("year", { ascending: false })
      .limit(20);

    if (paperSearch.trim()) {
      query = query.ilike("syllabus_id", `%${paperSearch.trim()}%`);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ papers: data ?? [] });
  }

  return NextResponse.json({ error: "Provide paperId or paperSearch" }, { status: 400 });
}

// POST: add a question to a paper
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase } = auth;

  const body = await request.json();
  const { paper_id, question_number, page_number, topic_id, subtopic, difficulty, marks, question_text } = body;

  if (!paper_id || !question_number) {
    return NextResponse.json({ error: "paper_id and question_number are required" }, { status: 400 });
  }
  if (difficulty && !["easy", "medium", "hard"].includes(difficulty)) {
    return NextResponse.json({ error: "difficulty must be easy, medium, or hard" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("exam_questions")
    .insert({
      paper_id,
      question_number: String(question_number).trim(),
      page_number: page_number || null,
      topic_id: topic_id?.trim() || null,
      subtopic: subtopic?.trim() || null,
      difficulty: difficulty || null,
      marks: marks || null,
      question_text: question_text?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ question: data });
}
