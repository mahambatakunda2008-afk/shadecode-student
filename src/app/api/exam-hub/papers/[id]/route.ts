import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertRequestedLearnerSubject, resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes — plenty for viewing, short enough to limit leaked-link risk

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: paper, error: paperError } = await supabase
      .from("past_papers")
      .select("*")
      .eq("id", id)
      .single();

    if (paperError || !paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    // This endpoint issues a signed storage URL, so enforce subject access
    // before generating one. Catalog IDs must not bypass onboarding choices.
    const learner = await resolveLearnerSubjects(supabase, user.id);
    if (learner.subjects.length === 0) {
      return NextResponse.json(
        { error: "Choose your subjects in onboarding before opening past papers.", code: "SUBJECT_NOT_ALLOWED" },
        { status: 409 },
      );
    }

    const { data: syllabus, error: syllabusError } = await supabase
      .from("syllabi")
      .select("id, subject")
      .eq("id", paper.syllabus_id)
      .maybeSingle();

    if (syllabusError) throw syllabusError;
    if (!syllabus || !assertRequestedLearnerSubject(learner.subjects, syllabus.subject)) {
      return NextResponse.json(
        { error: "That paper is not available for your selected subjects.", code: "SUBJECT_NOT_ALLOWED" },
        { status: 403 },
      );
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("past-papers")
      .createSignedUrl(paper.file_path, SIGNED_URL_TTL_SECONDS);

    if (signedError || !signed) {
      return NextResponse.json({ error: "Failed to generate file URL" }, { status: 500 });
    }

    const { data: state } = await supabase
      .from("user_past_paper_state")
      .select("*")
      .eq("user_id", user.id)
      .eq("paper_id", id)
      .maybeSingle();

    return NextResponse.json({
      paper: { ...paper, state: state ?? null },
      signedUrl: signed.signedUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load paper" },
      { status: 500 }
    );
  }
}
