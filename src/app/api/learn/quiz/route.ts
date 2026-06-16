import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { learnQuizSchema, validateRequestBody } from "@/lib/validation/schemas";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

async function callAI(prompt: string): Promise<string | null> {
  const TIMEOUT_MS = 15000; // 15 second timeout per provider

  async function fetchWithTimeout(url: string, options: RequestInit, timeout = TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw err;
    }
  }

  if (process.env.CLOUDFLARE_API_TOKEN) {
    try {
      console.log("[Quiz AI] Trying Cloudflare Workers AI...");
      const res = await fetchWithTimeout(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
        { method: "POST", headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: 1500 }) }
      );
      const d = await res.json();
      const t = typeof d?.result?.response === "string" ? d.result.response : null;
      if (t && t.length > 20) {
        console.log("[Quiz AI] Cloudflare Workers AI succeeded");
        return t;
      }
    } catch (err) { console.error("[Quiz AI] Cloudflare failed:", err); }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      console.log("[Quiz AI] Trying OpenAI...");
      const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 1500, response_format: { type: "json_object" } }),
      });
      const d = await res.json();
      const t = d.choices?.[0]?.message?.content;
      if (t && t.length > 20) {
        console.log("[Quiz AI] OpenAI succeeded");
        return t;
      }
    } catch (err) { console.error("[Quiz AI] OpenAI failed:", err); }
  }

  const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3].filter(Boolean) as string[];
  for (const key of keys) {
    for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
      try {
        console.log(`[Quiz AI] Trying Gemini (${model})...`);
        const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1500, responseMimeType: "application/json" } }),
        });
        const d = await res.json();
        const t = d?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (t && t.length > 20) {
          console.log(`[Quiz AI] Gemini (${model}) succeeded`);
          return t;
        }
      } catch (err) { console.error(`[Quiz AI] Gemini (${model}) failed:`, err); }
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    try {
      console.log("[Quiz AI] Trying OpenRouter...");
      const res = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://shadecodestudent.vercel.app" },
        body: JSON.stringify({ model: "meta-llama/llama-3.3-70b-instruct:free", messages: [{ role: "user", content: prompt }], max_tokens: 1500 }),
      });
      const d = await res.json();
      const t = d.choices?.[0]?.message?.content;
      if (t && t.length > 20) {
        console.log("[Quiz AI] OpenRouter succeeded");
        return t;
      }
    } catch (err) { console.error("[Quiz AI] OpenRouter failed:", err); }
  }

  console.error("[Quiz AI] All providers exhausted.");
  return null;
}

function safeParseJSON(raw: string) {
  const candidates = [
    raw,
    raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim(),
    raw.replace(/\\(?!["\\/bfnrtu])/g, "\\\\"),
    raw.replace(/\\/g, ""),
  ];
  for (const text of candidates) {
    try {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) { const p = JSON.parse(m[0]); if (p?.questions) return p; }
    } catch {}
  }
  return null;
}

export async function POST(req: Request) {
  try {
    // Apply rate limiting for AI-powered endpoint
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck;

    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    
    // Validate request body
    const validation = validateRequestBody(body, learnQuizSchema);
    if (!validation.success || !validation.data) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validation.details?.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
      }, { status: 400 });
    }

    const { lessonId } = validation.data;

    const { data: lesson, error: lessonErr } = await supabase
      .from("learn_lessons")
      .select("id, title, subject_id, blocks, difficulty")
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (lessonErr || !lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

    const { data: subjectRow } = await supabase
      .from("subjects").select("name").eq("id", lesson.subject_id).maybeSingle();

    const subject = subjectRow?.name ?? "the subject";
    const blocks  = (lesson.blocks ?? []) as { type: string; content: string }[];
    const content = blocks.map(b => `[${b.type.toUpperCase()}] ${b.content}`).join("\n\n");

    const prompt = `You are a ${subject} teacher. Based on this lesson, generate exactly 5 multiple-choice quiz questions to test student understanding.

LESSON TITLE: ${lesson.title}

LESSON CONTENT:
${content}

Return ONLY a valid JSON object:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["A) option one", "B) option two", "C) option three", "D) option four"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why A is correct and why others are wrong."
    }
  ]
}

STRICT RULES:
- Exactly 5 questions, all multiple choice with exactly 4 options
- Questions must test understanding of THIS specific lesson content
- correctIndex is 0-based (0=A, 1=B, 2=C, 3=D)
- explanation must be 1-2 sentences, clear and educational
- Do NOT use LaTeX backslashes. Use plain text math (x^2, sin(x), etc.)
- Output ONLY the JSON object, nothing else`;

    const raw    = await callAI(prompt);
    console.log("[Quiz] AI response length:", raw?.length ?? 0);
    
    if (!raw) {
      console.error("[Quiz] AI returned null/empty");
      return NextResponse.json({ error: "AI unavailable - all providers failed or timed out" }, { status: 503 });
    }

    console.log("[Quiz] Raw AI response (first 500 chars):", raw.slice(0, 500));

    const parsed = safeParseJSON(raw);
    console.log("[Quiz] Parsed result:", parsed ? "success" : "failed");
    
    if (!parsed?.questions?.length) {
      console.error("[Quiz] No questions in parsed result, parsed:", parsed);
      return NextResponse.json({ error: "Failed to generate quiz - AI returned invalid format" }, { status: 500 });
    }

    console.log("[Quiz] Generated", parsed.questions.length, "questions");
    return NextResponse.json({ questions: parsed.questions.slice(0, 5) });

  } catch (err) {
    console.error("Quiz generation error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
