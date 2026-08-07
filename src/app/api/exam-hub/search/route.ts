import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseSearchQuery } from "@/lib/exam-hub/searchQuery";

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

    const parsed = parseSearchQuery(q);

    // Find candidate syllabus ids whose subject name matches any leftover
    // keyword (e.g. "physics", "mathematics") — this is how the parser
    // hands off from "structured tokens extracted" to "subject resolved".
    let syllabusIds: string[] | null = null;
    if (parsed.subjectKeywords.length > 0) {
      const { data: matchedSyllabi } = await supabase
        .from("syllabi")
        .select("id, subject")
        .or(parsed.subjectKeywords.map((kw) => `subject.ilike.%${kw}%`).join(","));
      if (matchedSyllabi && matchedSyllabi.length > 0) {
        syllabusIds = matchedSyllabi.map((s) => s.id);
      }
    }

    let query = supabase
      .from("past_papers")
      .select("*, syllabi(subject, board)")
      .limit(30);

    if (syllabusIds) query = query.in("syllabus_id", syllabusIds);
    if (parsed.year) query = query.eq("year", parsed.year);
    if (parsed.session) query = query.eq("session", parsed.session);
    if (parsed.level) query = query.eq("level", parsed.level);
    if (parsed.paperNumber) query = query.eq("paper_number", parsed.paperNumber);
    if (parsed.variant) query = query.eq("variant", parsed.variant);

    const { data: papers, error } = await query.order("year", { ascending: false });
    if (error) throw error;

    // Also search indexed question text for any remaining keywords — degrades
    // gracefully to zero results while exam_questions is still empty, rather
    // than fabricating a topic match.
    let questionMatches: { paper_id: string; question_number: string }[] = [];
    if (parsed.keywords.length > 0) {
      const { data: questions } = await supabase
        .from("exam_questions")
        .select("paper_id, question_number")
        .textSearch("question_text_search", parsed.keywords.join(" | "))
        .limit(30);
      questionMatches = questions ?? [];
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
