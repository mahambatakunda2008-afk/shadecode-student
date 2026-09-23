import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function authenticate(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const client = admin();
  const { data: { user }, error } = await client.auth.getUser(token);
  return error || !user ? null : { client, user };
}

function validId(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id);
}

function clampProgress(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
}

export async function GET(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = new URL(req.url).searchParams.get("id");
    if (!validId(id)) return NextResponse.json({ error: "Invalid generation id." }, { status: 400 });

    const { data, error } = await auth.client
      .from("cortex_generation_jobs")
      .select("id,kind,status,stage,request,partial,result,error,progress,completed_units,total_units,retry_count,heartbeat_at,created_at,updated_at")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: "Unable to load generation state." }, { status: 500 });
    return NextResponse.json({ job: data ?? null });
  } catch {
    return NextResponse.json({ error: "Generation state unavailable." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!validId(body.id) || !["lesson", "course", "revision", "exam"].includes(body.kind)) {
      return NextResponse.json({ error: "Invalid generation job." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const row = {
      id: body.id,
      user_id: auth.user.id,
      kind: body.kind,
      status: ["queued","warming","generating","partial","complete","failed","cancelled"].includes(body.status) ? body.status : "queued",
      stage: typeof body.stage === "string" ? body.stage.slice(0, 80) : "queued",
      request: body.request && typeof body.request === "object" ? body.request : {},
      partial: body.partial ?? null,
      result: body.result ?? null,
      error: body.error ?? null,
      progress: clampProgress(body.progress),
      retry_count: typeof body.retryCount === "number" ? Math.max(0, Math.round(body.retryCount)) : 0,
      heartbeat_at: now,
      updated_at: now,
    };

    const { data, error } = await auth.client
      .from("cortex_generation_jobs")
      .upsert(row, { onConflict: "id" })
      .select("id,status,stage,progress,retry_count,updated_at")
      .single();

    if (error) return NextResponse.json({ error: "Unable to persist generation state." }, { status: 500 });
    return NextResponse.json({ job: data });
  } catch {
    return NextResponse.json({ error: "Generation state unavailable." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await authenticate(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!validId(body.id)) return NextResponse.json({ error: "Invalid generation id." }, { status: 400 });

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      heartbeat_at: new Date().toISOString(),
    };
    if (typeof body.status === "string") patch.status = body.status;
    if (typeof body.stage === "string") patch.stage = body.stage.slice(0, 80);
    if (typeof body.progress === "number") patch.progress = clampProgress(body.progress);
    if (typeof body.retryCount === "number") patch.retry_count = Math.max(0, Math.round(body.retryCount));
    if (body.partial !== undefined) patch.partial = body.partial;
    if (body.result !== undefined) patch.result = body.result;
    if (body.error !== undefined) patch.error = body.error;

    const { data, error } = await auth.client
      .from("cortex_generation_jobs")
      .update(patch)
      .eq("id", body.id)
      .eq("user_id", auth.user.id)
      .select("id,status,stage,progress,retry_count,updated_at")
      .maybeSingle();

    if (error) return NextResponse.json({ error: "Unable to update generation state." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Generation job not found." }, { status: 404 });
    return NextResponse.json({ job: data });
  } catch {
    return NextResponse.json({ error: "Generation state unavailable." }, { status: 500 });
  }
}
