import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRequestClient } from "@/lib/supabase/authenticated-request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";
import { resolveVerifiedCurriculumPromptContext } from "@/lib/curriculum/ai-grounding";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 50;

/**
 * Reads only explicitly approved, versioned learning assets for the learner's verified curriculum.
 * This route never generates content. A missing asset is an honest empty result.
 */
export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter);
  if (limited) return limited;

  const params = new URL(request.url).searchParams;
  const requestedSubject = (params.get("subject") ?? "").trim().slice(0, 60);
  const topicKey = (params.get("topicKey") ?? "").trim().slice(0, 160);

  if (!requestedSubject) {
    return NextResponse.json({ error: "Choose a subject.", assets: [] }, { status: 400 });
  }

  try {
    const auth = await createAuthenticatedRequestClient(request);
    if (!auth) {
      return NextResponse.json({ error: "Sign in to access published learning assets.", assets: [] }, { status: 401 });
    }

    const { supabase, user } = auth;
    const subjectAccess = await resolveLearnerSubject(supabase, user.id, requestedSubject);
    if (!subjectAccess.ok) {
      return NextResponse.json({ error: subjectAccess.error, code: "SUBJECT_NOT_ALLOWED", assets: [] }, { status: subjectAccess.status });
    }

    const resolved = await resolveVerifiedCurriculumPromptContext(
      user.id,
      topicKey
        ? `${subjectAccess.subject}\nmaster this request: "${topicKey}"`
        : subjectAccess.subject,
    );

    if (resolved.status !== "resolved" || !resolved.pack?.curriculumId) {
      return NextResponse.json({
        assets: [],
        coverage: "unavailable",
        message: "No verified curriculum is currently resolved for this subject. No syllabus-specific assets were returned.",
      }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const admin = createSupabaseAdminClient();
    if (!admin) {
      return NextResponse.json({ error: "Published content is temporarily unavailable.", retryable: true, assets: [] }, { status: 503 });
    }

    let query = admin
      .from("published_learning_assets")
      .select("id, curriculum_version_id, asset_key, asset_version, asset_type, title, subject_id, topic_key, objective_keys, content, provenance, quality_checks, published_at")
      .eq("curriculum_version_id", resolved.pack.curriculumId)
      .eq("review_status", "approved")
      .not("published_at", "is", null)
      .order("topic_key", { ascending: true })
      .order("title", { ascending: true })
      .limit(MAX_RESULTS);

    if (topicKey) query = query.eq("topic_key", topicKey);

    const { data, error } = await query;
    if (error) {
      console.error("[library/published] query failed", error);
      return NextResponse.json({ error: "Published content could not be loaded.", retryable: true, assets: [] }, { status: 503 });
    }

    return NextResponse.json({
      assets: data ?? [],
      coverage: data?.length ? "available" : "missing",
      curriculum: {
        board: resolved.pack.board ?? null,
        qualification: resolved.pack.qualification ?? null,
        syllabusId: resolved.pack.syllabusId ?? null,
        syllabusVersion: resolved.pack.syllabusVersion ?? null,
        subject: resolved.pack.subject,
      },
      message: data?.length
        ? "Published assets are available for this verified curriculum."
        : "No reviewed published asset matches this curriculum and topic yet. This is a content gap, not a generation failure.",
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[library/published]", error);
    return NextResponse.json({ error: "Published content is temporarily unavailable.", retryable: true, assets: [] }, { status: 503 });
  }
}
