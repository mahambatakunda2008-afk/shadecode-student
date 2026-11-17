import { CortexCore } from "@/lib/cortex/core";
import { resolveUserSystemCurriculum } from "@/lib/curriculum/user-resolution";
import { log } from "@/lib/observability";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getUserIdFromRequest, requirePermission } from '@/lib/auth/rbac';
import { cortexApproveDraftSchema, cortexRequestSchema, validateRequestBody } from '@/lib/validation/schemas';
import { applyRateLimit, aiEndpointLimiter } from '@/lib/rate-limit/limiter';

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase server credentials.');
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function requestedCurriculumSubjectId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const value = (payload as Record<string, unknown>).subjectId ?? (payload as Record<string, unknown>).curriculumSubjectId;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function GET(req: Request) {
  try {
    const action = new URL(req.url).searchParams.get('action') || '';
    if (action !== 'get_drafts') return Response.json({ error: 'unsupported_action' }, { status: 400 });
    const permissionCheck = await requirePermission(req, 'approve_drafts');
    if (permissionCheck) return permissionCheck;
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from('generated_course_drafts').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) {
        log.cortexFailure({ stage: "get_course_drafts", error: error.message });
        return Response.json({ error: "draft_storage_unavailable" }, { status: 503 });
      }
      return Response.json(data ?? []);
    } catch (error) {
      log.cortexFailure({ stage: "get_course_drafts", error: error instanceof Error ? error.message : "draft_storage_unavailable" });
      return Response.json({ error: "draft_storage_unavailable" }, { status: 503 });
    }
  } catch (e: any) {
    log.apiFailure({ route: "/api/cortex", method: "GET", error: e.message || String(e) });
    return Response.json({ error: e.message || 'failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: any = null;
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || '';

    if (action === 'approve_draft') {
      const permissionCheck = await requirePermission(req, 'approve_drafts');
      if (permissionCheck) return permissionCheck;
      body = await req.json().catch(() => ({}));
      const validation = validateRequestBody(body, cortexApproveDraftSchema);
      if (!validation.success) return Response.json({ error: 'Validation failed', details: validation.details?.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message })) }, { status: 400 });

      const approvedBy = await getUserIdFromRequest(req);
      if (!approvedBy) return Response.json({ error: "Unauthorized" }, { status: 401 });

      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase.rpc("approve_generated_course_draft", {
          p_draft_id: validation.data.id,
          p_approved_by: approvedBy,
        });
        if (error) {
          log.cortexFailure({ stage: "approve_draft", error: error.message, userId: approvedBy });
          const status = error.code === "P0002" ? 404
            : error.code === "42501" ? 403
              : error.code === "22023" ? 400
                : error.code === "P0001" ? 409 : 503;
          const message = error.code === "P0002" ? "draft_not_found"
            : error.code === "42501" ? "insufficient_permissions"
              : error.code === "22023" ? "invalid_course_draft"
                : error.code === "P0001" ? "draft_not_approvable" : "draft_approval_unavailable";
          return Response.json({ error: message, retryable: status >= 500 }, { status });
        }
        return Response.json(data ?? { ok: true });
      } catch (error) {
        log.cortexFailure({ stage: "approve_draft", error: error instanceof Error ? error.message : String(error), userId: approvedBy });
        return Response.json({ error: "draft_approval_unavailable", retryable: true }, { status: 503 });
      }
    }

    body = await req.json().catch(() => ({}));
    const authenticatedUserId = await getUserIdFromRequest(req);
    if (!authenticatedUserId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (body?.requestType) {
      const requestedUserId = body?.payload?.userId;
      if (requestedUserId && requestedUserId !== authenticatedUserId) return Response.json({ error: 'Forbidden' }, { status: 403 });
      try {
        const { cortexAI } = await import("@/lib/cortex/runtime/ai-gateway");
        const curriculum = await resolveUserSystemCurriculum(authenticatedUserId, requestedCurriculumSubjectId(body.payload));
        const payload = curriculum.context
          ? { ...body.payload, userId: authenticatedUserId, curriculumContext: curriculum.context }
          : { ...body.payload, userId: authenticatedUserId };
        const result = await cortexAI(body.requestType, payload);
        return Response.json({ insight: result.data?.insight ?? null, provider: result.provider, cached: result.cached, curriculum: { resolved: !curriculum.blocked, reason: curriculum.reason } });
      } catch (e) {
        log.cortexFailure({ stage: "behavior.insight", error: e instanceof Error ? e.message : "cortex_ai_failed", userId: authenticatedUserId });
        return Response.json({ insight: null, error: e instanceof Error ? e.message : "cortex_ai_failed" });
      }
    }

    const { userId, type, payload } = body;
    if (userId !== authenticatedUserId) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const validation = validateRequestBody({ userId, type, payload }, cortexRequestSchema);
    if (!validation.success || !validation.data) return Response.json({ error: 'Validation failed', details: validation.details?.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message })) }, { status: 400 });
    const { userId: validatedUserId, type: validatedType, payload: validatedPayload } = validation.data;
    if (!validatedUserId || !validatedType) return Response.json({ error: "Missing userId or type" }, { status: 400 });
    if (validatedType === 'careers.list') {
      try { const { listCareers } = await import('@/lib/careers'); return Response.json({ success: true, careers: await listCareers() }); }
      catch (e: any) { return Response.json({ error: e.message || 'failed' }, { status: 500 }); }
    }
    if (validatedType === 'careers.get') {
      try {
        const slug = validatedPayload?.slug;
        if (!slug) return Response.json({ error: 'missing slug' }, { status: 400 });
        const { getCareerBySlug } = await import('@/lib/careers');
        const res = await getCareerBySlug(slug as string);
        if (!res) return Response.json({ error: 'not found' }, { status: 404 });
        return Response.json({ success: true, ...res });
      } catch (e: any) { return Response.json({ error: e.message || 'failed' }, { status: 500 }); }
    }
    if (validatedType === 'learn' && validatedPayload?.research === true) {
      const rateLimit = await applyRateLimit(req, aiEndpointLimiter);
      if (rateLimit) return rateLimit;
    }
    const curriculum = await resolveUserSystemCurriculum(
      validatedUserId,
      requestedCurriculumSubjectId(validatedPayload),
    );
    const authorization = req.headers.get("authorization") ?? "";
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    return Response.json(await CortexCore({
      userId: validatedUserId,
      accessToken,
      type: validatedType as any,
      payload: validatedPayload,
      curriculum: curriculum.context ?? null,
    }));
  } catch (err: any) {
    log.cortexFailure({ stage: "CortexCore", error: err.message || "Cortex failure", userId: body?.userId });
    return Response.json({ error: err.message || "Cortex failure" }, { status: 500 });
  }
}
