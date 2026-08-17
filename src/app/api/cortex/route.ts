import { CortexCore } from "@/lib/cortex/core";
import fs from 'fs';
import path from 'path';
import { log } from "@/lib/observability";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requirePermission } from '@/lib/auth/rbac';
import { cortexApproveDraftSchema, cortexRequestSchema, validateRequestBody } from '@/lib/validation/schemas';

export const dynamic = "force-dynamic";

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
    const action = new URL(req.url).searchParams.get('action') || '';
    if (action !== 'get_drafts') return Response.json({ error: 'unsupported_action' }, { status: 400 });
    const permissionCheck = await requirePermission(req, 'approve_drafts');
    if (permissionCheck) return permissionCheck;
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from('generated_course_drafts').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return Response.json(data ?? []);
    } catch {
      return Response.json(readDrafts());
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

      const id = validation.data?.id;
      let userId: string | undefined;
      try {
        const supabase = getSupabaseAdmin();
        const { data: draftsData } = await supabase.from('generated_course_drafts').select('*').eq('id', id).maybeSingle();
        let entry = draftsData;
        if (!entry) {
          const drafts = readDrafts();
          const idx = drafts.findIndex((d: any) => d.id === id);
          if (idx === -1) return Response.json({ error: 'not_found' }, { status: 404 });
          entry = drafts[idx];
        }
        if (!entry?.draft) return Response.json({ error: 'invalid_entry' }, { status: 400 });
        userId = entry.user_id || entry.userId;
        if (!userId) throw new Error('Missing user id on draft');

        const subjName = (entry.draft.title && entry.draft.title.length <= 60) ? entry.draft.title : 'Generated Course';
        const { data: existing } = await supabase.from('subjects').select('id').eq('user_id', userId).eq('name', subjName).maybeSingle();
        let subjectId = existing?.id ?? null;
        if (!subjectId) {
          const { data: insertedSub, error: subjectError } = await supabase.from('subjects').insert({ user_id: userId, name: subjName }).select('id').single();
          if (subjectError) throw subjectError;
          subjectId = insertedSub?.id ?? null;
        }
        if (!subjectId) throw new Error('Failed to resolve subject');

        const lessons = Array.isArray(entry.draft.lessons) ? entry.draft.lessons : [];
        const lessonsToInsert = lessons.map((l: any) => ({ user_id: userId, subject_id: subjectId, title: (l.title ?? l.summary ?? 'Untitled').toString().slice(0,255), description: (l.summary ?? '').toString().slice(0,1000), difficulty: l.difficulty === 'hard' ? 'hard' : l.difficulty === 'medium' ? 'medium' : 'easy', blocks: Array.isArray(l.blocks) ? l.blocks : [{ type: 'text', content: l.summary ?? '' }], progress: 0 }));
        const { data: insertedLessons, error: lessonsInsertError } = await supabase.from('learn_lessons').insert(lessonsToInsert).select('id, title');
        if (lessonsInsertError) throw new Error(`Failed to insert lessons: ${lessonsInsertError.message}`);
        if (lessonsToInsert.length > 0 && (insertedLessons ?? []).length === 0) throw new Error('Lesson insert returned no rows despite lessons being submitted');

        const titleToId = new Map<string, string>();
        (insertedLessons ?? []).forEach((r: any) => titleToId.set(r.title, r.id));
        const prereqInserts: any[] = [];
        for (const l of lessons) {
          const insertedId = titleToId.get((l.title ?? l.summary ?? '').toString().slice(0,255));
          if (!insertedId) continue;
          for (const pTitle of Array.isArray(l.prerequisites) ? l.prerequisites : []) {
            const pid = titleToId.get(pTitle.toString().slice(0,255));
            if (pid && pid !== insertedId) prereqInserts.push({ lesson_id: insertedId, prerequisite_lesson_id: pid });
          }
        }
        const seen = new Set<string>();
        const deduped = prereqInserts.filter(r => { const k = `${r.lesson_id}::${r.prerequisite_lesson_id}`; if (seen.has(k)) return false; seen.add(k); return true; });
        if (deduped.length) {
          const { error } = await supabase.from('lesson_prerequisites').insert(deduped);
          if (error) throw new Error(`Failed to insert prerequisites: ${error.message}`);
        }

        const result = { lessonsInserted: (insertedLessons ?? []).length };
        const { error: approvalError } = await supabase.from('generated_course_approvals').insert({ draft_id: id, notes: { source: 'admin_api' } });
        if (approvalError) throw new Error(`Failed to write approval audit: ${approvalError.message}`);
        const { error: updateError } = await supabase.from('generated_course_drafts').update({ status: 'approved', approved_at: new Date().toISOString(), result }).eq('id', id);
        if (updateError) throw new Error(`Failed to update draft status: ${updateError.message}`);

        try {
          const drafts = readDrafts();
          const idx = drafts.findIndex((d: any) => d.id === id);
          if (idx !== -1) { drafts[idx].status = 'approved'; drafts[idx].approved_at = new Date().toISOString(); drafts[idx].result = result; writeDrafts(drafts); }
        } catch { /* database remains authoritative */ }
        return Response.json({ ok: true, result });
      } catch (e: any) {
        log.cortexFailure({ stage: "approve_draft", error: e.message || String(e), userId });
        return Response.json({ error: e.message || String(e) }, { status: 500 });
      }
    }

    body = await req.json().catch(() => ({}));
    if (body?.requestType) {
      try {
        const { cortexAI } = await import("@/lib/cortex/runtime/ai-gateway");
        const result = await cortexAI(body.requestType, body.payload);
        return Response.json({ insight: result.data?.insight ?? null, provider: result.provider, cached: result.cached });
      } catch (e) {
        log.cortexFailure({ stage: "behavior.insight", error: e instanceof Error ? e.message : "cortex_ai_failed", userId: body?.payload?.userId });
        return Response.json({ insight: null, error: e instanceof Error ? e.message : "cortex_ai_failed" });
      }
    }

    const { userId, type, payload } = body;
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
    return Response.json(await CortexCore({ userId: validatedUserId, type: validatedType as any, payload: validatedPayload }));
  } catch (err: any) {
    log.cortexFailure({ stage: "CortexCore", error: err.message || "Cortex failure", userId: body?.userId });
    return Response.json({ error: err.message || "Cortex failure" }, { status: 500 });
  }
}
