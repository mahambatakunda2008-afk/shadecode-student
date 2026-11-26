import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SyncBody = {
  attemptId?: unknown;
  clientRevision?: unknown;
  deviceId?: unknown;
  status?: unknown;
  payload?: unknown;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return bad("Authentication required", 401);

  let body: SyncBody;
  try {
    body = await request.json() as SyncBody;
  } catch {
    return bad("Invalid JSON");
  }

  const { attemptId, clientRevision, deviceId, status, payload } = body;
  if (typeof attemptId !== "string" || !/^[A-Za-z0-9:_-]{1,200}$/.test(attemptId)) return bad("Invalid attemptId");
  if (typeof clientRevision !== "number" || !Number.isSafeInteger(clientRevision) || clientRevision < 1) return bad("Invalid clientRevision");
  if (typeof deviceId !== "string" || deviceId.length < 1 || deviceId.length > 200) return bad("Invalid deviceId");
  if (status !== "active" && status !== "submitted") return bad("Invalid attempt status");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return bad("Invalid attempt payload");
  if ((payload as Record<string, unknown>).attemptId !== attemptId) return bad("Attempt identity does not match payload");\n  if ((payload as Record<string, unknown>).userId !== user.id) return bad("Attempt account does not match authenticated user", 403);\n  let payloadBytes = 0; try { payloadBytes = new TextEncoder().encode(JSON.stringify(payload)).length; } catch { return bad("Invalid attempt payload"); }\n  if (payloadBytes > 1_500_000) return bad("Attempt payload exceeds the 1.5 MB sync limit", 413);

  const { data, error } = await supabase.rpc("sync_exam_attempt", {
    p_attempt_id: attemptId,
    p_client_revision: clientRevision,
    p_device_id: deviceId,
    p_status: status,
    p_payload: payload as never,
  });

  if (error) {
    if (error.code === "42501") return bad("Authentication required", 401);
    console.error("[api/exam/attempt-sync] failed", { userId: user.id, attemptId, code: error.code, message: error.message });
    return bad("Exam attempt sync failed", 500);
  }

  const result = data as { status?: string; revision?: number } | null;
  if (!result || !["accepted", "already-applied", "conflict"].includes(result.status ?? "")) {
    return bad("Unexpected exam attempt sync response", 500);
  }
  return NextResponse.json({ ok: true, ...result }, { status: result.status === "conflict" ? 409 : 200 });
}


export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return bad("Authentication required", 401);
  const { data, error } = await supabase.rpc("get_my_exam_attempts");
  if (error) {
    console.error("[api/exam/attempt-sync] recovery failed", { userId: user.id, code: error.code });
    return bad("Exam attempt recovery failed", 500);
  }
  const attempts = Array.isArray(data) ? data.filter((row) => row && row.user_id === user.id && row.payload && typeof row.payload === "object" && (row.payload as Record<string, unknown>).userId === user.id && (row.payload as Record<string, unknown>).attemptId === row.attempt_id) : [];\n  return NextResponse.json({ ok: true, attempts });
}
