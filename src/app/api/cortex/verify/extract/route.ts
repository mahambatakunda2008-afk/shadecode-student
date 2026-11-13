import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { parseCortexJson, validateCortexObject } from "@/lib/cortex/outputContract";
import { validateVerifyExtraction } from "@/lib/cortex/verify/extraction-contract";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const PROVIDER_TIMEOUT_MS = 20_000;
const GEMINI_KEYS = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3].filter(Boolean) as string[];
const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3-flash-preview"];

type ExtractionResult = {
  rawText: string;
  confidence: number;
  warnings: string[];
};

function parseExtraction(text: string): ExtractionResult {
  const parsed = parseCortexJson(text) as Record<string, unknown>;
  const validation = validateCortexObject(parsed, {
    minTextLength: 0,
    maxTextLength: 120_000,
    allowEmptyStringPaths: ["rawText"],
  });
  if (!validation.ok || typeof parsed.rawText !== "string" ||
      typeof parsed.confidence !== "number" || !Number.isFinite(parsed.confidence) ||
      parsed.confidence < 0 || parsed.confidence > 1 ||
      !Array.isArray(parsed.warnings) ||
      !parsed.warnings.every((item) => typeof item === "string")) {
    throw new Error("Image extraction returned an invalid structured result.");
  }
  return validateVerifyExtraction(parsed);
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Image extraction timed out")), PROVIDER_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function extractWithGemini(image: { data: string; mimeType: string }): Promise<ExtractionResult> {
  let lastError: unknown;
  for (const key of GEMINI_KEYS) {
    const client = new GoogleGenerativeAI(key);
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 5000 },
        });
        const prompt = `Transcribe the visible source image as faithfully as possible.
Return ONLY JSON: {"rawText":"...","confidence":0.0,"warnings":[]}.
Preserve line breaks, paragraph order, spelling, punctuation, mathematical symbols and visible labels as they appear. Do not solve, correct, complete, summarize, translate or silently repair anything. If a character is uncertain, use [unclear] and explain the uncertainty in warnings. Do not claim to understand a graph, diagram or table from its labels alone. Describe non-text visual content only as a warning, not as invented transcription. Confidence is an overall estimate from 0 to 1. If no readable text exists, return an empty rawText and a warning.`;
        const result = await withTimeout(model.generateContent([
          prompt,
          { inlineData: image },
        ]));
        return parseExtraction(result.response.text());
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No image extraction provider is configured.");
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limited = await applyRateLimit(req, aiEndpointLimiter);
    if (limited) return limited;

    const formData = await req.formData();
    if (formData.get("cloudConsent") !== "true") {
      return NextResponse.json({ error: "Explicit consent is required before sending a student image for cloud extraction." }, { status: 403 });
    }
    const file = formData.get("image");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ error: "Choose an image to extract." }, { status: 400 });
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Use a JPG, PNG or WEBP image." }, { status: 415 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "That image is too large. Choose one under 4 MB." }, { status: 413 });
    }

    const image = { data: Buffer.from(await file.arrayBuffer()).toString("base64"), mimeType: file.type };
    const result = await extractWithGemini(image);
    return NextResponse.json({ ...result, execution: "online-cloud", sourceStored: false });
  } catch (error) {
    console.error("[cortex/verify/extract]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Cloud extraction is temporarily unavailable. Your source image has not been stored by this service." }, { status: 502 });
  }
}
