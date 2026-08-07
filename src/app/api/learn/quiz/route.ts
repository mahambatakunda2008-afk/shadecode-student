import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { learnQuizSchema, validateRequestBody } from "@/lib/validation/schemas";
import { callAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

export const maxDuration = 60;

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

    const raw    = await callAI(prompt, 2000, { userId: user.id, feature: "lesson_assistant", subfeature: "quiz" });
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
