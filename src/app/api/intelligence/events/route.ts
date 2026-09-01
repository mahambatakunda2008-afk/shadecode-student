import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLearningEvent, type SupportedSourceEvent } from "@/lib/intelligence/learningEvents";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function asString(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function safeMetadata(value: unknown): Record<string, string | number | boolean | null> | undefined { if (!isRecord(value)) return undefined; const output: Record<string, string | number | boolean | null> = {}; for (const [key, item] of Object.entries(value)) if (typeof item === "string" || typeof item === "number" || typeof item === "boolean" || item === null) output[key] = item; return output; }

/** Authenticated canonical learning-event ingress. The eventId envelope is the durable local-sync idempotency key. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    const event = isRecord(body.event) ? body.event : body;
    const eventId = asString(body.eventId) ?? asString(event.sourceEventId);
    const input: SupportedSourceEvent = {
      userId: user.id,
      source: asString(event.source) ?? "unknown",
      sourceEventId: eventId ?? "",
      type: asString(event.type) ?? "",
      occurredAt: asString(event.occurredAt),
      subjectId: asString(event.subjectId),
      topicId: asString(event.topicId),
      entityId: asString(event.entityId),
      attemptId: asString(event.attemptId),
      metadata: safeMetadata(event.metadata ?? event.data),
    };
    const normalized = normalizeLearningEvent(input);
    if (normalized.status === "unsupported") return NextResponse.json({ error: "Unsupported or invalid learning event", source: normalized.source, sourceEventId: normalized.sourceEventId }, { status: 400 });
    const { data: persisted, error: persistError } = await supabase.rpc("insert_canonical_cortex_event", { p_user_id: user.id, p_event: normalized.event });
    if (persistError) {
      console.error("[learning-events] persistence failed:", persistError);
      return NextResponse.json({ error: "Failed to persist learning event" }, { status: 500 });
    }
    return NextResponse.json({ accepted: true, persisted: true, duplicateSafe: true, event: normalized.event, recordId: persisted?.id ?? null });
  } catch (error) {
    console.error("[learning-events] ingress failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
