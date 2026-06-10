import { createClient as createSupabaseClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase server credentials.');
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: careers } = await supabase.from('careers').select('id, slug, title, description, salary_low, salary_high').order('title', { ascending: true });
    return new Response(JSON.stringify({ careers: careers ?? [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'failed' }), { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const adminToken = req.headers.get('x-admin-token') || '';
    if (!process.env.ADMIN_REVIEW_TOKEN || adminToken !== process.env.ADMIN_REVIEW_TOKEN) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const supabase = getSupabaseAdmin();

    if (action === 'create') {
      const career = body.career || {};
      const { title, slug, description } = career;
      const salary_low = career.salary_low ? parseInt(String(career.salary_low)) : null;
      const salary_high = career.salary_high ? parseInt(String(career.salary_high)) : null;
      if (!title || !slug) return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400 });
      const { data, error } = await supabase.from('careers').insert({ title, slug, description, salary_low, salary_high }).select('id').single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      return new Response(JSON.stringify({ ok: true, id: data.id }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'unsupported_action' }), { status: 400 });
  } catch (e: any) { return new Response(JSON.stringify({ error: e.message || 'failed' }), { status: 500 }); }
}
