import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveVerifiedCurriculumPromptContext } from "@/lib/curriculum/ai-grounding";
import { assertRequestedLearnerSubject, resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(req.url);
    const subject = (url.searchParams.get("subject") || "").trim();
    const topic = (url.searchParams.get("topic") || "").trim();
    if (!subject || !topic) return NextResponse.json({ error: "subject and topic are required" }, { status: 400 });

    const learner = await resolveLearnerSubjects(supabase, user.id);
    if (learner.subjects.length === 0) {
      return NextResponse.json({ error: "Choose your subjects in onboarding before using curriculum grounding.", code: "SUBJECT_NOT_ALLOWED" }, { status: 409 });
    }
    if (!assertRequestedLearnerSubject(learner.subjects, subject)) {
      return NextResponse.json({ error: "That subject is not available for your selected subjects.", code: "SUBJECT_NOT_ALLOWED" }, { status: 403 });
    }

    const result = await resolveVerifiedCurriculumPromptContext(user.id, `Subject: ${subject}\nMaster this request: "${topic}"`);
    const normalizedPackSubject = result.status === "resolved" && result.pack ? result.pack.subject.trim().replace(/^(as|a)[ -]?level\\s+/i, "").toLowerCase() : "";
    if (result.status === "resolved" && result.pack && normalizedPackSubject !== subject.toLowerCase()) {
      return NextResponse.json({ error: "The curriculum profile does not match your selected subject.", code: "CURRICULUM_SUBJECT_MISMATCH" }, { status: 409 });
    }
    return NextResponse.json({ status: result.status, reason: result.reason, resolvedTopic: result.status === "resolved" ? result.resolvedTopic : undefined, promptContext: result.promptContext, pack: result.status === "resolved" ? result.pack : undefined }, { status: result.status === "blocked" ? 409 : 200 });
  } catch (error) {
    console.error("[api/curriculum/grounding] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
