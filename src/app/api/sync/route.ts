import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["tasks", "subjects", "learn_lessons", "education_profile", "learning_events"]);
const ID_RE = /^[A-Za-z0-9:_-]{1,200}$/;

type Body = { operation?: "create" | "update" | "delete"; store?: string; payload?: Record<string, unknown>; clientVersion?: number; baseVersion?: number; deviceId?: string };

function bad(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }

export async function POST(request: Request) {
  const supabase = await createClient();
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
  if (operation === "delete") {
    const { data: existing, error } = await supabase.from(store).select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!existing) return NextResponse.json({ ok: true, status: "already-applied", id });
    const { error: deleteError } = await supabase.from(store).delete().eq("id", id).eq("user_id", user.id);
    if (deleteError) return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "accepted", id });
  }
  const safePayload = Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "user_id" && key !== "created_at"));
  const writePayload = { ...safePayload, id, user_id: user.id };
  const { error } = await supabase.from(store).upsert(writePayload, { onConflict: "id" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: "accepted", id, clientVersion, baseVersion: baseVersion ?? null, deviceId: deviceId ?? null });
}
