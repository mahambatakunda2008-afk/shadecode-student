import { NextRequest, NextResponse } from "next/server";
import { cortexAI } from "@/lib/cortex/runtime/ai-gateway";
import {
  CortexAIRequestPayloadMap,
  CortexAIRequestType,
  CortexEvent,
  CortexSnapshot,
} from "@/lib/cortex/types";

interface CortexGatewayRequestBody {
  requestType?: CortexAIRequestType;
  payload?: unknown;
  userId?: string;
  behaviorSummary?: string;
  fingerprint?: string;
  events?: CortexEvent[];
  snapshot?: CortexSnapshot;
}

function isSnapshot(value: unknown): value is CortexSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CortexSnapshot>;
  return (
    typeof candidate.streak === "number" &&
    typeof candidate.level === "number" &&
    typeof candidate.xp === "number" &&
    typeof candidate.totalTasks === "number" &&
    typeof candidate.completedTasks === "number" &&
    typeof candidate.pendingTasks === "number" &&
    Array.isArray(candidate.subjects) &&
    Array.isArray(candidate.recentTaskTitles)
  );
}

function isCortexAIRequestType(value: unknown): value is CortexAIRequestType {
  return value === "behavior.insight" || value === "behavior.summary";
}

function toGatewayRequest(body: CortexGatewayRequestBody): {
  requestType: CortexAIRequestType;
  payload: CortexAIRequestPayloadMap[CortexAIRequestType];
} {
  if (isCortexAIRequestType(body.requestType) && body.payload && typeof body.payload === "object") {
    return {
      requestType: body.requestType,
      payload: body.payload as CortexAIRequestPayloadMap[CortexAIRequestType],
    };
  }

  if (isSnapshot(body.snapshot)) {
    return {
      requestType: "behavior.insight",
      payload: {
        userId: typeof body.userId === "string" ? body.userId : "anonymous",
        snapshot: body.snapshot,
        events: Array.isArray(body.events) ? body.events : [],
        fingerprint: typeof body.fingerprint === "string" ? body.fingerprint : undefined,
      },
    };
  }

  if (typeof body.behaviorSummary === "string" && body.behaviorSummary.trim()) {
    return {
      requestType: "behavior.summary",
      payload: {
        userId: typeof body.userId === "string" ? body.userId : "anonymous",
        behaviorSummary: body.behaviorSummary.trim(),
        fingerprint: typeof body.fingerprint === "string" ? body.fingerprint : undefined,
      },
    };
  }

  throw new Error("Invalid Cortex AI request payload.");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CortexGatewayRequestBody;
    const { requestType, payload } = toGatewayRequest(body);
    const result =
      requestType === "behavior.insight"
        ? await cortexAI("behavior.insight", payload as CortexAIRequestPayloadMap["behavior.insight"])
        : await cortexAI("behavior.summary", payload as CortexAIRequestPayloadMap["behavior.summary"]);

    return NextResponse.json({
      requestType: result.requestType,
      insight: result.data.insight,
      cached: result.cached,
      source: result.provider,
      fingerprint: result.fingerprint,
      cacheKey: result.cacheKey,
    });
  } catch (err) {
    console.error("Cortex route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
