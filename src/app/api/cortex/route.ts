import { CortexCore } from "@/lib/cortex/core";
import { resolveUserSystemCurriculum } from "@/lib/curriculum/user-resolution";
import { log } from "@/lib/observability";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getUserIdFromRequest, requirePermission } from '@/lib/auth/rbac';
import { cortexApproveDraftSchema, cortexRequestSchema, validateRequestBody } from '@/lib/validation/schemas';
import { applyRateLimit, aiEndpointLimiter } from '@/lib/rate-limit/limiter';

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Bound multi-stage Cortex retrieval and synthesis within one request.

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

    const viewerId = await getUserIdFromRequest(req);
    if (!viewerId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: assignments, error: assignmentsError } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', viewerId);
    if (assignmentsError) {
      log.cortexFailure({ stage: "get_course_drafts_roles", error: assignmentsError.message, userId: viewerId });
      return Response.json({ error: "Unable to verify draft access scope.", code: "DRAFT_SCOPE_UNAVAILABLE" }, { status: 503 });
    }

    const roleIds = (assignments ?? []).map((assignment: { role_id: string }) => assignment.role_id);
    const { data: roles, error: rolesError } = roleIds.length
      ? await supabase.from('roles').select('name, permissions').in('id', roleIds)
      : { data: [], error: null };
    if (rolesError) {
      log.cortexFailure({ stage: "get_course_drafts_roles", error: rolesError.message, userId: viewerId });
      return Response.json({ error: "Unable to verify draft access scope.", code: "DRAFT_SCOPE_UNAVAILABLE" }, { status: 503 });
    }

    const isGlobalAdmin = (roles ?? []).some((role: { name: string; permissions: Record<string, unknown> | null }) =>
      role.name === 'admin' && role.permissions?.approve_drafts === true
    );

    let query = supabase
      .from('generated_course_drafts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!isGlobalAdmin) {
      const { data: memberships, error: membershipsError } = await supabase
        .from('platform_institution_members')
        .select('institution_id')
        .eq('user_id', viewerId)
        .eq('membership_role', 'administrator')
        .eq('status', 'active');
      if (membershipsError) {
        log.cortexFailure({ stage: "get_course_drafts_memberships", error: membershipsError.message, userId: viewerId });
        return Response.json({ error: "Unable to verify institution draft access.", code: "DRAFT_SCOPE_UNAVAILABLE" }, { status: 503 });
      }

      const institutionIds = (memberships ?? []).map((membership: { institution_id: string }) => membership.institution_id);
      if (!institutionIds.length) return Response.json([]);
      query = query.in('institution_id', institutionIds);
    }

    const { data, error } = await query;
    if (error) {
      log.cortexFailure({ stage: "get_course_drafts", error: error.message, userId: viewerId });
      return Response.json({
        error: "Draft storage is unavailable. No temporary filesystem copy will be used.",
        code: "DRAFT_STORAGE_UNAVAILABLE",
      }, { status: 503 });
    }

    const drafts = data ?? [];
    if (isGlobalAdmin || drafts.length === 0) return Response.json(drafts);

    const institutionIdsForDrafts = [...new Set(drafts
      .map((draft: { institution_id: string | null }) => draft.institution_id)
      .filter((id: string | null): id is string => Boolean(id)))];
    const ownerIdsForDrafts = [...new Set(drafts.map((draft: { user_id: string }) => draft.user_id))];
    if (!institutionIdsForDrafts.length || !ownerIdsForDrafts.length) return Response.json([]);

    const { data: ownerMemberships, error: ownerMembershipsError } = await supabase
      .from('platform_institution_members')
      .select('institution_id, user_id')
      .in('institution_id', institutionIdsForDrafts)
      .in('user_id', ownerIdsForDrafts)
      .eq('status', 'active');
    if (ownerMembershipsError) {
      log.cortexFailure({ stage: "get_course_drafts_owner_memberships", error: ownerMembershipsError.message, userId: viewerId });
      return Response.json({ error: "Unable to verify draft owner institution scope.", code: "DRAFT_SCOPE_UNAVAILABLE" }, { status: 503 });
    }

    const activeOwnerMemberships = new Set((ownerMemberships ?? []).map((membership: { institution_id: string; user_id: string }) =>
      `${membership.institution_id}:${membership.user_id}`
    ));
    return Response.json(drafts.filter((draft: { institution_id: string | null; user_id: string }) =>
      Boolean(draft.institution_id && activeOwnerMemberships.has(`${draft.institution_id}:${draft.user_id}`))
    ));
  } catch (e: any) {
    log.apiFailure({ route: "/api/cortex", method: "GET", error: e.message || String(e) });
    return Response.json({
      error: "Draft storage is unavailable. No temporary filesystem copy will be used.",
      code: "DRAFT_STORAGE_UNAVAILABLE",
    }, { status: 503 });
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

      const approvedBy = await getUserIdFromRequest(req);
      if (!approvedBy) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      body = await req.json().catch(() => ({}));
      const validation = validateRequestBody(body, cortexApproveDraftSchema);
      if (!validation.success || !validation.data) {
        return Response.json({
          error: 'Validation failed',
          details: validation.details?.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
        }, { status: 400 });
      }

      try {
        const supabase = getSupabaseAdmin();
        const { data: result, error } = await supabase.rpc('approve_generated_course_draft', {
          p_draft_id: validation.data.id,
          p_approved_by: approvedBy,
        });

        if (error) {
          if (error.code === '42501') return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
          if (error.code === 'P0002') return Response.json({ error: 'Draft not found' }, { status: 404 });
          if (error.code === '22023' || error.code === '55000') {
            return Response.json({ error: 'Draft cannot be approved in its current state.' }, { status: 409 });
          }
          if (error.code === 'PGRST202' || error.code === '42883') {
            return Response.json({
              error: 'Atomic approval is not installed yet. The draft remains unchanged; retry after the database migration is deployed.',
              code: 'APPROVAL_NOT_READY',
              retryable: true,
            }, { status: 503 });
          }
          log.cortexFailure({ stage: "approve_draft", error: error.message || "atomic_approval_failed", userId: approvedBy });
          return Response.json({
            error: 'Course approval did not complete. The database transaction was not acknowledged.',
            code: 'APPROVAL_FAILED',
            retryable: true,
          }, { status: 500 });
        }

        return Response.json({ ok: true, result });
      } catch (e: any) {
        log.cortexFailure({ stage: "approve_draft", error: e.message || String(e), userId: approvedBy });
        return Response.json({
          error: 'Course approval is temporarily unavailable. The draft has not been reported as approved.',
          code: 'APPROVAL_UNAVAILABLE',
          retryable: true,
        }, { status: 503 });
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
