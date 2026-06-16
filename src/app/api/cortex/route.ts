import { CortexCore } from "@/lib/cortex/core";
import fs from 'fs';
import path from 'path';
import { log } from "@/lib/observability";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/rbac';
import { 
  cortexApproveDraftSchema, 
  cortexRequestSchema,
  validateRequestBody,
  createValidationErrorResponse 
} from '@/lib/validation/schemas';

const DRAFTS_DIR = path.join(process.cwd(), 'src', 'app', 'api', 'cortex', 'generate-course');
const DRAFTS_FILE = path.join(DRAFTS_DIR, 'drafts.json');

function ensureDrafts() {
  if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  if (!fs.existsSync(DRAFTS_FILE)) fs.writeFileSync(DRAFTS_FILE, JSON.stringify([]));
}

function readDrafts() { ensureDrafts(); try { return JSON.parse(fs.readFileSync(DRAFTS_FILE, 'utf8') || '[]'); } catch { return []; } }
function writeDrafts(drafts: any[]) { ensureDrafts(); fs.writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2)); }

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase server credentials.');
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || '';
    if (action === 'get_drafts') {
      try {
        const supabase = getSupabaseAdmin();
        const { data } = await supabase.from('generated_course_drafts').select('*').order('created_at', { ascending: false }).limit(200);
        return new Response(JSON.stringify(data ?? []), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (e) {
        // Fallback to file-based storage
        const drafts = readDrafts();
        return new Response(JSON.stringify(drafts), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }
    return new Response(JSON.stringify({ error: 'unsupported_action' }), { status: 400 });
  } catch (e: any) {
    log.apiFailure({ route: "/api/cortex", method: "GET", error: e.message || String(e) });
    return new Response(JSON.stringify({ error: e.message || 'failed' }), { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: any = null;
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || '';

    if (action === 'approve_draft') {
      // Check authorization using RBAC (new) or admin token (legacy for backward compatibility)
      const authHeader = req.headers.get('authorization');
      const adminToken = req.headers.get('x-admin-token') || '';
      
      // Try RBAC first (preferred method)
      if (authHeader?.startsWith('Bearer ')) {
        const permissionCheck = await requirePermission(req, 'approve_drafts');
        if (permissionCheck) return permissionCheck;
      } 
      // Fallback to legacy admin token for backward compatibility
      else if (!process.env.ADMIN_REVIEW_TOKEN || adminToken !== process.env.ADMIN_REVIEW_TOKEN) {
        return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
      }
      
      body = await req.json().catch(() => ({}));
      
      // Validate request body
      const validation = validateRequestBody(body, cortexApproveDraftSchema);
      if (!validation.success) {
        return new Response(JSON.stringify({ 
          error: 'Validation failed', 
          details: validation.details?.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      const id = validation.data?.id;
      let userId: string | undefined = undefined;

    try {
      const supabase = getSupabaseAdmin();
      // Fetch draft row from DB
      const { data: draftsData } = await supabase.from('generated_course_drafts').select('*').eq('id', id).maybeSingle();
      let entry = draftsData;
      // Fallback to file-based drafts
      if (!entry) {
        const drafts = readDrafts();
        const idx = drafts.findIndex((d: any) => d.id === id);
        if (idx === -1) return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
        entry = drafts[idx];
      }

      if (!entry || !entry.draft) return new Response(JSON.stringify({ error: 'invalid_entry' }), { status: 400 });
      userId = entry.user_id || entry.userId;
      if (!userId) throw new Error('Missing user id on draft');

      const subjName = (entry.draft.title && entry.draft.title.length <= 60) ? entry.draft.title : `Generated Course`;
      let subjectId: string | null = null;
      try {
        const { data: existing } = await supabase.from('subjects').select('id').eq('user_id', userId).eq('name', subjName).maybeSingle();
        if (existing?.id) subjectId = existing.id;
        else {
          const { data: insertedSub } = await supabase.from('subjects').insert({ user_id: userId, name: subjName }).select('id').single();
          subjectId = insertedSub?.id ?? null;
        }
      } catch (e) { console.error('subject create', e); }
      if (!subjectId) throw new Error('Failed to resolve subject');

      const lessons = Array.isArray(entry.draft.lessons) ? entry.draft.lessons : [];
      const lessonsToInsert = lessons.map((l: any) => ({ user_id: userId, subject_id: subjectId, title: (l.title ?? l.summary ?? 'Untitled').toString().slice(0,255), description: (l.summary ?? '').toString().slice(0,1000), difficulty: (l.difficulty === 'hard' ? 'hard' : l.difficulty === 'medium' ? 'medium' : 'easy'), blocks: Array.isArray(l.blocks) ? l.blocks : [{ type: 'text', content: l.summary ?? '' }], progress: 0 }));
      const { data: insertedLessons } = await supabase.from('learn_lessons').insert(lessonsToInsert).select('id, title');
      const titleToId = new Map();
      (insertedLessons ?? []).forEach((r: any) => titleToId.set(r.title, r.id));

      const prereqInserts: any[] = [];
      for (const l of lessons) {
        const lessonTitleKey = (l.title ?? l.summary ?? '').toString().slice(0,255);
        const insertedId = titleToId.get(lessonTitleKey);
        if (!insertedId) continue;
        const prereqs = Array.isArray(l.prerequisites) ? l.prerequisites : [];
        for (const pTitle of prereqs) {
          const pKey = pTitle.toString().slice(0,255);
          const pid = titleToId.get(pKey);
          if (pid && pid !== insertedId) prereqInserts.push({ lesson_id: insertedId, prerequisite_lesson_id: pid });
        }
      }
      const seen = new Set(); const deduped: any[] = [];
      for (const r of prereqInserts) { const k = `${r.lesson_id}::${r.prerequisite_lesson_id}`; if (!seen.has(k)) { seen.add(k); deduped.push(r); } }
      if (deduped.length > 0) { try { await supabase.from('lesson_prerequisites').insert(deduped); } catch (e) { console.error('prereq insert', e); } }

      // Write approval audit and update draft row
      try {
        await supabase.from('generated_course_approvals').insert({ draft_id: id, approved_by: null, notes: { source: 'admin_api' } });
        await supabase.from('generated_course_drafts').update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: null, result: { lessonsInserted: (insertedLessons ?? []).length } }).eq('id', id);
      } catch (e) { console.error('audit insert failed', e); }

      // If file-based, update file
      try {
        const drafts = readDrafts();
        const idx = drafts.findIndex((d: any) => d.id === id);
        if (idx !== -1) { drafts[idx].status = 'approved'; drafts[idx].approved_at = new Date().toISOString(); drafts[idx].result = { lessonsInserted: (insertedLessons ?? []).length }; writeDrafts(drafts); }
      } catch (e) {}

      return new Response(JSON.stringify({ ok: true, result: { lessonsInserted: (insertedLessons ?? []).length } }), { status: 200 });
    } catch (e: any) {
      console.error('approve error', e);
      log.cortexFailure({ stage: "approve_draft", error: e.message || String(e), userId });
      return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 });
    }
    }

    body = await req.json().catch(() => ({}));

    // Behavioral insight path — used by the dashboard Cortex component, which
    // posts { requestType: "behavior.insight", payload: { userId, events, snapshot } }.
    if (body?.requestType) {
      try {
        const { cortexAI } = await import("@/lib/cortex/runtime/ai-gateway");
        const result = await cortexAI(body.requestType, body.payload);
        return Response.json({
          insight: result.data?.insight ?? null,
          provider: result.provider,
          cached: result.cached,
        });
      } catch (e) {
        // Non-fatal: the client falls back to deterministic insights.
        log.cortexFailure({
          stage: "behavior.insight",
          error: e instanceof Error ? e.message : "cortex_ai_failed",
          userId: body?.payload?.userId,
        });
        return Response.json(
          { insight: null, error: e instanceof Error ? e.message : "cortex_ai_failed" },
          { status: 200 }
        );
      }
    }

    // Fallback: preserve existing Cortex POST behavior
    const { userId, type, payload } = body;

    // Validate request body
    const validation = validateRequestBody({ userId, type, payload }, cortexRequestSchema);
    if (!validation.success || !validation.data) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validation.details?.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const { userId: validatedUserId, type: validatedType, payload: validatedPayload } = validation.data;

    if (!validatedUserId || !validatedType) {
      return Response.json(
        { error: "Missing userId or type" },
        { status: 400 }
      );
    }

    // Lightweight career API hooks
    if (validatedType === 'careers.list') {
      try {
        const { listCareers } = await import('@/lib/careers');
        const careers = await listCareers();
        return Response.json({ success: true, careers });
      } catch (e: any) { return Response.json({ error: e.message || 'failed' }, { status: 500 }); }
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

    const result = await CortexCore({
      userId: validatedUserId,
      type: validatedType as any,
      payload: validatedPayload,
    });

    return Response.json(result);
  } catch (err: any) {
    log.cortexFailure({
      stage: "CortexCore",
      error: err.message || "Cortex failure",
      userId: body?.userId,
    });
    return Response.json(
      { error: err.message || "Cortex failure" },
      { status: 500 }
    );
  }
}