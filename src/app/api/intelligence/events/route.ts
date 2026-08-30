import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeLearningEvent, type SupportedSourceEvent } from "@/lib/intelligence/learningEvents";

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

/**
 * Canonical learning-event ingress.
 *
 * Authentication is authoritative: the client may not submit an arbitrary userId.
 * Until the legacy learning_events table has been migrated to the canonical schema,
 * this endpoint intentionally returns the normalized event rather than persisting it.
 * That prevents a partial migration from silently destroying provenance/idempotency.
 */
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

    return NextResponse.json({ accepted: true, persisted: false, event: normalized.event });
  } catch (error) {
    console.error("[learning-events] ingress failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
