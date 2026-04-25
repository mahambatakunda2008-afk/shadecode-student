import {
  buildBehaviorSummary,
  buildCortexFingerprint,
  resolveCortexExtension,
} from "@/lib/cortex/runtime/engine";
import {
  createCortexCacheKey,
  getCachedCortexValue,
  setCachedCortexValue,
} from "@/lib/cortex/runtime/cache";
import {
  CortexAIRequestPayloadMap,
  CortexAIRequestType,
  CortexAIResponse,
  CortexBehaviorInsightPayload,
  CortexBehaviorSummaryPayload,
  CortexStructuredValue,
} from "@/lib/cortex/types";

const inflightRequests = new Map<string, Promise<CortexAIResponse>>();

function isStructuredValue(value: unknown): value is CortexStructuredValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isStructuredValue(item));
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.values(value).every((item) => isStructuredValue(item));
}

function assertStructuredPayload(payload: unknown): asserts payload is CortexStructuredValue {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !isStructuredValue(payload)) {
    throw new Error("Cortex AI payload must be a structured JSON object.");
  }
}

function hashText(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function normalizeUserId(userId: string) {
  return userId.trim() || "anonymous";
}

function normalizeInsight(text: string) {
  return text
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim()
    .replace(/\s+/g, " ");
}

function extractInsightFromJson(text: string) {
  const normalized = normalizeInsight(text);
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  const jsonText =
    start >= 0 && end > start ? normalized.slice(start, end + 1) : normalized;
  const parsed = JSON.parse(jsonText) as { insight?: unknown };

  if (typeof parsed.insight !== "string" || !parsed.insight.trim()) {
    throw new Error("Cortex AI response did not include a valid insight.");
  }

  return parsed.insight.trim();
}

function buildBehaviorPrompt(summary: string) {
  return `You are Cortex, a behavioral interpretation layer inside a student productivity app called Shadecode Student.
Analyze the student data and return ONLY valid JSON with exactly this shape: {"insight":"..."}.
The insight value must be exactly one complete sentence, between 8 and 20 words, with a neutral analytical tone.

Rules:
- Output valid JSON only
- Do not include markdown or code fences
- Never motivate or encourage
- Never ask questions
- Never give advice
- Do not use conversational language
- Keep the response reusable and specific to the provided data

Student behavioral data:
${summary}`;
}

function getInsightFingerprint(payload: CortexBehaviorInsightPayload) {
  return payload.fingerprint?.trim() || buildCortexFingerprint(payload.snapshot, payload.events ?? []);
}

function getSummaryFingerprint(payload: CortexBehaviorSummaryPayload) {
  return payload.fingerprint?.trim() || hashText(payload.behaviorSummary.trim());
}

function buildCacheKey<T extends CortexAIRequestType>(
  requestType: T,
  payload: CortexAIRequestPayloadMap[T],
  fingerprint: string
) {
  return createCortexCacheKey(`${requestType}:${normalizeUserId(payload.userId)}`, fingerprint);
}

async function requestGeminiInsight(summary: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: buildBehaviorPrompt(summary),
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 120,
          temperature: 0.2,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini returned an empty Cortex response.");
  }

  return extractInsightFromJson(text);
}

async function executeBehaviorInsight(
  payload: CortexBehaviorInsightPayload,
  fingerprint: string,
  cacheKey: string
): Promise<CortexAIResponse<"behavior.insight">> {
  const localInsight = resolveCortexExtension({
    events: payload.events ?? [],
    snapshot: payload.snapshot,
  });

  if (localInsight) {
    const result: CortexAIResponse<"behavior.insight"> = {
      requestType: "behavior.insight",
      provider: "local",
      cached: false,
      fingerprint,
      cacheKey,
      data: {
        insight: localInsight,
      },
    };

    setCachedCortexValue(cacheKey, result);
    return result;
  }

  const remoteInsight = await requestGeminiInsight(
    buildBehaviorSummary(payload.snapshot, payload.events ?? [])
  );

  const result: CortexAIResponse<"behavior.insight"> = {
    requestType: "behavior.insight",
    provider: "gemini",
    cached: false,
    fingerprint,
    cacheKey,
    data: {
      insight: remoteInsight,
    },
  };

  setCachedCortexValue(cacheKey, result);
  return result;
}

async function executeBehaviorSummary(
  payload: CortexBehaviorSummaryPayload,
  fingerprint: string,
  cacheKey: string
): Promise<CortexAIResponse<"behavior.summary">> {
  const remoteInsight = await requestGeminiInsight(payload.behaviorSummary.trim());

  const result: CortexAIResponse<"behavior.summary"> = {
    requestType: "behavior.summary",
    provider: "gemini",
    cached: false,
    fingerprint,
    cacheKey,
    data: {
      insight: remoteInsight,
    },
  };

  setCachedCortexValue(cacheKey, result);
  return result;
}

async function executeRequest<T extends CortexAIRequestType>(
  requestType: T,
  payload: CortexAIRequestPayloadMap[T],
  fingerprint: string,
  cacheKey: string
): Promise<CortexAIResponse<T>> {
  switch (requestType) {
    case "behavior.insight":
      return (await executeBehaviorInsight(
        payload as CortexBehaviorInsightPayload,
        fingerprint,
        cacheKey
      )) as CortexAIResponse<T>;
    case "behavior.summary":
      return (await executeBehaviorSummary(
        payload as CortexBehaviorSummaryPayload,
        fingerprint,
        cacheKey
      )) as CortexAIResponse<T>;
    default:
      throw new Error(`Unsupported Cortex AI request type: ${String(requestType)}`);
  }
}

export async function cortexAI<T extends CortexAIRequestType>(
  requestType: T,
  payload: CortexAIRequestPayloadMap[T]
): Promise<CortexAIResponse<T>> {
  assertStructuredPayload(payload);

  const normalizedPayload = Object.assign({}, payload, {
    userId: normalizeUserId(payload.userId),
  }) as CortexAIRequestPayloadMap[T];

  const fingerprint =
    requestType === "behavior.insight"
      ? getInsightFingerprint(normalizedPayload as CortexBehaviorInsightPayload)
      : getSummaryFingerprint(normalizedPayload as CortexBehaviorSummaryPayload);
  const cacheKey = buildCacheKey(requestType, normalizedPayload, fingerprint);
  const cached = getCachedCortexValue<CortexAIResponse<T>>(cacheKey);

  if (cached) {
    return {
      ...cached,
      cached: true,
      cacheKey,
      fingerprint,
    };
  }

  const inflightKey = `${requestType}:${cacheKey}`;
  const existingRequest = inflightRequests.get(inflightKey);
  if (existingRequest) {
    return (await existingRequest) as CortexAIResponse<T>;
  }

  const requestPromise = executeRequest(
    requestType,
    normalizedPayload,
    fingerprint,
    cacheKey
  ) as Promise<CortexAIResponse>;

  inflightRequests.set(inflightKey, requestPromise);

  try {
    return (await requestPromise) as CortexAIResponse<T>;
  } finally {
    inflightRequests.delete(inflightKey);
  }
}
