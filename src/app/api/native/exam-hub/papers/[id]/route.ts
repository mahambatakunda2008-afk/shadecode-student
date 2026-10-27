import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";
import { isAllowedSubject } from "@/lib/academic/subjectContract";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const learner = await resolveLearnerSubjects(supabase, user.id);
    if (learner.subjects.length === 0) {
      return NextResponse.json({ error: "Choose your subjects before opening past papers.", code: "SUBJECT_NOT_ALLOWED" }, { status: 409 });
    }

    const { id } = await params;
    const { data: paper, error: paperError } = await supabase
      .from("past_papers")
      .select("id, syllabus_id, file_path, level, session, year, paper_number, variant, kind")
      .eq("id", id)
      .maybeSingle();

    if (paperError) throw paperError;
    if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

    const { data: syllabus, error: syllabusError } = await supabase
      .from("syllabi")
      .select("subject")
      .eq("id", paper.syllabus_id)
      .maybeSingle();

    if (syllabusError) throw syllabusError;
    if (!syllabus || !isAllowedSubject(syllabus.subject, learner.subjects.map((subject) => subject.name))) {
      return NextResponse.json({ error: "That paper is not available for your selected subjects.", code: "SUBJECT_NOT_ALLOWED" }, { status: 403 });
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("past-papers")
      .createSignedUrl(paper.file_path, 600);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not prepare the paper file." }, { status: 502 });
    }

    return NextResponse.json({ paper, signedUrl: signed.signedUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not open this paper." },
      { status: 500 },
    );
  }
}
