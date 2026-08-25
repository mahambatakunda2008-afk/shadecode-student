import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { generateRevisionSchema, validateRequestBody } from "@/lib/validation/schemas";
import { callAI } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7).trim() || null : null;
}

function extractJSONObject(raw: string): string | null {
  const text = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

export async function POST(req: Request) {
  // Apply rate limiting for AI-powered endpoint
  const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
  if (rateLimitCheck) return rateLimitCheck;

  // This endpoint calls a paid LLM per request. Every other AI-touching
  // route in this codebase requires an authenticated user for exactly this
  // reason (cost attribution, abuse prevention, per-user tracking) -- this
  // one didn't, and had no live caller in the product to justify the gap.
  // See docs/audits/2026-08-24-security-audit.md.
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const validation = validateRequestBody(body, generateRevisionSchema);
  if (!validation.success || !validation.data) {
    return NextResponse.json({
      error: "Validation failed",
      details: validation.details?.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
    }, { status: 400 });
  }

  const { content, topic } = validation.data;

  const prompt = `You are a study assistant. Convert this lesson into structured revision data.
Return ONLY valid JSON in this format:
{"summary":"","flashcards":[{"q":"","a":""}],"questions":[""]}

Topic: ${topic}

Content:
${content}`;

  // Routed through the shared provider fallback chain (Cloudflare -> Gemini
  // -> OpenAI -> OpenRouter) instead of a bespoke direct-OpenAI fetch with
  // no timeout and no fallback -- same gateway every other AI route uses,
  // with per-user cost attribution via userId.
  const raw = await callAI(prompt, 2000, { userId: user.id, feature: "content_generation", subfeature: "generate_revision" });
  if (!raw) return NextResponse.json({ error: "AI unavailable - all providers failed or timed out" }, { status: 503 });

  const jsonText = extractJSONObject(raw) ?? raw;
  try {
    return NextResponse.json(JSON.parse(jsonText));
  } catch {
    return NextResponse.json({ error: "AI returned an invalid response. Please try again." }, { status: 422 });
  }
}
