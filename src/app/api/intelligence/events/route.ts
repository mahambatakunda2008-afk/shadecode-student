import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLearningEvent, type SupportedSourceEvent } from "@/lib/intelligence/learningEvents";
import { projectLearningEvent } from "@/lib/intelligence/projectLearningEvent";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeMetadata(value: unknown): Record<string, string | number | boolean | null> | undefined {
  if (!isRecord(value)) return undefined;
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean" || item === null) output[key] = item;
  }
  return output;
}

/** Authenticated canonical learning-event ingress, durable persistence, and rebuildable mastery projection. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body: unknown = await request.json();
    if (!isRecord(body)) return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });

    const input: SupportedSourceEvent = {
      userId: user.id,
      source: asString(body.source) ?? "unknown",
      sourceEventId: asString(body.sourceEventId) ?? "",
      type: asString(body.type) ?? "",
      occurredAt: asString(body.occurredAt),
      subjectId: asString(body.subjectId),
      topicId: asString(body.topicId),
      entityId: asString(body.entityId),
      attemptId: asString(body.attemptId),
      metadata: safeMetadata(body.metadata),
    };

    const normalized = normalizeLearningEvent(input);
    if (normalized.status === "unsupported") {
      return NextResponse.json({ error: "Unsupported or invalid learning event", source: normalized.source, sourceEventId: normalized.sourceEventId }, { status: 400 });
    }

    const { data: persisted, error: persistError } = await supabase.rpc("insert_canonical_cortex_event", {
      p_user_id: user.id,
      p_event: normalized.event,
    });
    if (persistError) {
      console.error("[learning-events] persistence failed:", persistError);
      return NextResponse.json({ error: "Failed to persist learning event" }, { status: 500 });
    }

    let projection: { projected: boolean; reason?: string } = { projected: false, reason: "not-attempted" };
    try {
      projection = await projectLearningEvent(supabase, normalized.event);
    } catch (projectionError) {
      console.error("[learning-events] mastery projection failed:", projectionError);
      return NextResponse.json({
        accepted: true,
        persisted: true,
        duplicateSafe: true,
        projectionPending: true,
        event: normalized.event,
        recordId: persisted?.id ?? null,
      }, { status: 202 });
    }

    return NextResponse.json({
      accepted: true,
      persisted: true,
      duplicateSafe: true,
      projection,
      event: normalized.event,
      recordId: persisted?.id ?? null,
    });
  } catch (error) {
    console.error("[learning-events] ingress failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
