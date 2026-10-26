import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAuthenticatedRequestClient } from "@/lib/supabase/authenticated-request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";

const ASSET_TYPES = new Set([
  "lesson", "worked_example", "diagram_task", "graph_task", "experiment",
  "practice_set", "answer_key", "revision_sheet", "exam_strategy",
]);
const REVIEW_STATES = new Set(["draft", "in_review", "approved", "rejected", "retired"]);
const MAX_BODY_BYTES = 300_000;

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function isEditor(email: string | undefined | null): boolean {
  const allowlist = (process.env.PUBLISHED_ASSET_EDITOR_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && allowlist.includes(email.toLowerCase()));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasReviewEvidence(quality: Record<string, unknown>, provenance: Record<string, unknown>) {
  return quality.syllabus_checked === true
    && quality.factual_accuracy_checked === true
    && quality.assessment_checked === true
    && quality.accessibility_checked === true
    && typeof provenance.source_reference === "string"
    && provenance.source_reference.trim().length >= 8
    && Array.isArray(quality.review_notes)
    && quality.review_notes.some((note) => typeof note === "string" && note.trim().length >= 12);
}

async function editorContext(request: NextRequest) {
  const auth = await createAuthenticatedRequestClient(request);
  if (!auth) return { error: responseError("Sign in required.", 401) } as const;
  if (!isEditor(auth.user.email)) {
    return { error: responseError("You are not allowed to manage published learning assets.", 403) } as const;
  }
  const admin = createSupabaseAdminClient();
  if (!admin) return { error: responseError("Content management is temporarily unavailable.", 503) } as const;
  return { auth, admin } as const;
}

/**
 * Private editorial workflow. No client can approve or publish content unless
 * their verified account email is explicitly listed in PUBLISHED_ASSET_EDITOR_EMAILS.
 */
export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter);
  if (limited) return limited;
  const context = await editorContext(request);
  if ("error" in context) return context.error;

  const state = request.nextUrl.searchParams.get("status") ?? "draft";
  if (!REVIEW_STATES.has(state)) return responseError("Unknown review status.", 400);

  const { data, error } = await context.admin
    .from("published_learning_assets")
    .select("id, curriculum_version_id, asset_key, asset_version, asset_type, title, subject_id, topic_key, objective_keys, content, provenance, quality_checks, review_status, reviewed_by, reviewed_at, published_at, created_at, updated_at")
    .eq("review_status", state)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[library/editor] list failed", error);
    return responseError("Editorial queue could not be loaded.", 503);
  }
  return NextResponse.json({ assets: data ?? [] }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter);
  if (limited) return limited;
  const context = await editorContext(request);
  if ("error" in context) return context.error;

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return responseError("Asset payload is too large.", 413);

  let body: unknown;
  try { body = JSON.parse(raw); } catch { return responseError("Request body must be valid JSON.", 400); }
  if (!isRecord(body)) return responseError("Asset payload must be an object.", 400);

  const curriculumVersionId = typeof body.curriculum_version_id === "string" ? body.curriculum_version_id.trim() : "";
  const assetKey = typeof body.asset_key === "string" ? body.asset_key.trim().slice(0, 180) : "";
  const assetType = typeof body.asset_type === "string" ? body.asset_type : "";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 240) : "";
  const subjectId = typeof body.subject_id === "string" ? body.subject_id.trim().slice(0, 80) : "";
  const topicKey = typeof body.topic_key === "string" ? body.topic_key.trim().slice(0, 180) : "";
  const content = body.content;
  const provenance = isRecord(body.provenance) ? body.provenance : {};
  const qualityChecks = isRecord(body.quality_checks) ? body.quality_checks : {};
  const objectiveKeys = Array.isArray(body.objective_keys)
    ? body.objective_keys.filter((key): key is string => typeof key === "string").slice(0, 100)
    : [];

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(curriculumVersionId)
    || !assetKey || !ASSET_TYPES.has(assetType) || !title || !subjectId || !topicKey
    || (!Array.isArray(content) && !isRecord(content))) {
    return responseError("Required fields are missing or invalid. Include curriculum_version_id, asset_key, asset_type, title, subject_id, topic_key, and object/array content.", 400);
  }

  const admin = context.admin;
  const { data: curriculum, error: curriculumError } = await admin
    .from("curriculum_versions")
    .select("id, subject_id, status")
    .eq("id", curriculumVersionId)
    .maybeSingle();

  if (curriculumError) return responseError("Curriculum could not be checked.", 503);
  if (!curriculum || curriculum.subject_id !== subjectId || curriculum.status !== "verified") {
    return responseError("Asset must match an existing verified curriculum version and subject.", 422);
  }

  const canonicalContent = JSON.stringify(content);
  const contentHash = createHash("sha256").update(canonicalContent).digest("hex");
  const { data, error } = await admin
    .from("published_learning_assets")
    .insert({
      curriculum_version_id: curriculumVersionId,
      asset_key: assetKey,
      asset_version: Number.isInteger(body.asset_version) && Number(body.asset_version) > 0 ? Number(body.asset_version) : 1,
      asset_type: assetType,
      title,
      subject_id: subjectId,
      topic_key: topicKey,
      objective_keys: objectiveKeys,
      content,
      provenance,
      quality_checks: qualityChecks,
      review_status: "draft",
      content_hash: contentHash,
    })
    .select("id, curriculum_version_id, asset_key, asset_version, asset_type, title, subject_id, topic_key, objective_keys, content, provenance, quality_checks, review_status, created_at, updated_at")
    .single();

  if (error) {
    console.error("[library/editor] draft create failed", error);
    return responseError(error.code === "23505" ? "That asset key and version already exist for this curriculum." : "Draft could not be saved.", error.code === "23505" ? 409 : 503);
  }

  return NextResponse.json({ asset: data, message: "Draft saved. It is not visible to learners until reviewed and published." }, {
    status: 201,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function PATCH(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter);
  if (limited) return limited;
  const context = await editorContext(request);
  if ("error" in context) return context.error;

  const raw = await request.text();
  if (raw.length > 16_000) return responseError("Review payload is too large.", 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return responseError("Request body must be valid JSON.", 400); }
  if (!isRecord(body) || typeof body.id !== "string" || typeof body.review_status !== "string") {
    return responseError("Provide an asset id and review_status.", 400);
  }
  const nextStatus = body.review_status;
  if (!REVIEW_STATES.has(nextStatus)) return responseError("Unknown review status.", 400);

  const { data: existing, error: readError } = await context.admin
    .from("published_learning_assets")
    .select("id, content, provenance, quality_checks, review_status, curriculum_version_id, subject_id")
    .eq("id", body.id)
    .maybeSingle();

  if (readError) return responseError("Asset could not be loaded for review.", 503);
  if (!existing) return responseError("Asset not found.", 404);

  const provenance = isRecord(existing.provenance) ? existing.provenance : {};
  const qualityChecks = isRecord(existing.quality_checks) ? existing.quality_checks : {};
  if (nextStatus === "approved" && !hasReviewEvidence(qualityChecks, provenance)) {
    return responseError("Cannot publish yet. Record source_reference, syllabus_checked, factual_accuracy_checked, assessment_checked, accessibility_checked, and at least one substantive review note first.", 422);
  }

  const now = new Date().toISOString();
  const update = {
    review_status: nextStatus,
    reviewed_by: nextStatus === "approved" || nextStatus === "rejected" ? context.auth.user.id : null,
    reviewed_at: nextStatus === "approved" || nextStatus === "rejected" ? now : null,
    published_at: nextStatus === "approved" ? now : null,
    updated_at: now,
  };

  const { data, error } = await context.admin
    .from("published_learning_assets")
    .update(update)
    .eq("id", body.id)
    .select("id, curriculum_version_id, asset_key, asset_version, asset_type, title, subject_id, topic_key, objective_keys, content, provenance, quality_checks, review_status, reviewed_by, reviewed_at, published_at, updated_at")
    .single();

  if (error) {
    console.error("[library/editor] review update failed", error);
    return responseError("Review decision could not be saved.", 503);
  }
  return NextResponse.json({ asset: data }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
