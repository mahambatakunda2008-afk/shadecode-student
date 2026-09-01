import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["tasks", "subjects", "learn_lessons", "education_profile", "learning_events"]);
const ID_RE = /^[A-Za-z0-9:_-]{1,200}$/;

type Body = { operation?: "create" | "update" | "delete"; store?: string; payload?: Record<string, unknown>; clientVersion?: number; baseVersion?: number; deviceId?: string };
function bad(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return bad("Authentication required", 401);
  let body: Body;
  try { body = await request.json(); } catch { return bad("Invalid JSON"); }
  const { operation, store, payload, clientVersion, baseVersion, deviceId } = body;
  if (!operation || !["create", "update", "delete"].includes(operation)) return bad("Invalid operation");
  if (!store || !ALLOWED.has(store)) return bad("Store is not syncable");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return bad("Payload is required");
  if (typeof clientVersion !== "number" || !Number.isSafeInteger(clientVersion) || clientVersion < 0) return bad("Invalid clientVersion");
  if (baseVersion !== undefined && (!Number.isSafeInteger(baseVersion) || baseVersion < 0)) return bad("Invalid baseVersion");
  if (deviceId !== undefined && (typeof deviceId !== "string" || deviceId.length > 200)) return bad("Invalid deviceId");
  const id = typeof payload.id === "string" ? payload.id : null;
  if (!id || !ID_RE.test(id)) return bad("A valid record id is required");
  if (store === "learning_events") return bad("Learning events must use /api/intelligence/events", 409);
  if (baseVersion === undefined) return bad("baseVersion is required for revision-safe sync");

  const { data, error } = await supabase.rpc("apply_sync_mutation", {
    p_store: store,
    p_operation: operation,
    p_record_id: id,
    p_payload: payload,
    p_base_version: baseVersion,
    p_client_version: clientVersion,
    p_device_id: deviceId ?? null,
  });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const result = (data ?? {}) as Record<string, unknown>;
  if (result.status === "conflict") return NextResponse.json(result, { status: 409 });
  if (result.status === "accepted") return NextResponse.json(result, { status: 200 });
  return NextResponse.json({ ok: false, error: "Unexpected sync result" }, { status: 500 });
}
