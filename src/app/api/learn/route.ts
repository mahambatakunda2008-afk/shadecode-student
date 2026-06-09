import { NextResponse } from "next/server";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

import type {
  LearnDetailResponse,
  LearnLesson,
  LearnListResponse,
  LearnSubject,
  LessonDifficulty,
} from "@/app/(app)/learn/types";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

interface SubjectRow { id: string; name: string; }
interface ProfileRow { xp: number | null; streak: number | null; level: number | null; }
interface LessonBlock { type: string; content: string; }
interface LearnLessonRow {
  id: string; subject_id: string; title: string;
  description: string | null; difficulty: string | null;
  progress: number | null; updated_at: string | null;
  blocks: LessonBlock[] | null;
}
interface AuthContext { supabase: SupabaseClient; user: User; }

// ── Supabase ──────────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

async function authenticateRequest(req: Request): Promise<AuthContext | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { supabase, user };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeDifficulty(v: string | null): LessonDifficulty {
  if (v === "medium" || v === "hard") return v;
  return "easy";
}

function clampProgress(v: number | null): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, Math.round(v)));
}

function toLearnLesson(row: LearnLessonRow, subjectById: Map<string, string>) {
  const progress = clampProgress(row.progress);
  return {
    id: row.id, subjectId: row.subject_id,
    subject: subjectById.get(row.subject_id) ?? "Unknown subject",
    title: row.title, description: row.description ?? "",
    difficulty: normalizeDifficulty(row.difficulty),
    progress, completed: progress >= 100,
    updated_at: row.updated_at ?? undefined,
    blocks: row.blocks ?? undefined,
  };
}

function buildSubjectTabs(subjects: SubjectRow[], lessons: LearnLessonRow[]): LearnSubject[] {
  const counts = lessons.reduce<Record<string, number>>((acc, l) => {
    acc[l.subject_id] = (acc[l.subject_id] ?? 0) + 1;
    return acc;
  }, {});
  return subjects.map(s => ({ id: s.id, name: s.name, lessonCount: counts[s.id] ?? 0 }));
}

// ── JSON parser — multi-stage recovery ───────────────────────────────────────

function safeParseJSON(raw: string): { title: string; blocks: LessonBlock[] } | null {
  let text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // Stage 1: direct parse
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      const p = JSON.parse(m[0]);
      if (p?.title && Array.isArray(p?.blocks)) return p;
    }
  } catch {}

  // Stage 2: fix unescaped backslashes
  try {
    const fixed = text.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
    const m = fixed.match(/\{[\s\S]*\}/);
    if (m) {
      const p = JSON.parse(m[0]);
      if (p?.title && Array.isArray(p?.blocks)) return p;
    }
  } catch {}

  // Stage 3: strip all backslashes
  try {
    const stripped = text.replace(/\\/g, "");
    const m = stripped.match(/\{[\s\S]*\}/);
    if (m) {
      const p = JSON.parse(m[0]);
      if (p?.title && Array.isArray(p?.blocks)) return p;
    }
  } catch {}

  // Stage 4: field-by-field extraction
  try {
    const titleMatch  = text.match(/"title"\s*:\s*"([^"]+)"/);
    const blocksMatch = text.match(/"blocks"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
    if (titleMatch && blocksMatch) {
      const blocks = JSON.parse(blocksMatch[1].replace(/\\(?!["\\/bfnrtu])/g, "\\\\"));
      if (Array.isArray(blocks)) return { title: titleMatch[1], blocks };
    }
  } catch {}

  console.error("[Parse] All stages failed. Raw excerpt:", raw.slice(0, 300));
  return null;
}

// ── AI providers ──────────────────────────────────────────────────────────────

async function callAI(prompt: string, maxTokens = 2500): Promise<string | null> {

  // 1. Cloudflare Workers AI
  if (process.env.CLOUDFLARE_API_TOKEN) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: maxTokens }),
        }
      );
      const data = await res.json();
      const text = typeof data?.result?.response === "string"
        ? data.result.response
        : JSON.stringify(data?.result?.response ?? "");
      if (text && text.length > 20) return text;
    } catch (err) { console.error("[AI] Cloudflare failed:", err); }
  }

  // 2. OpenAI (JSON mode)
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text && text.length > 20) return text;
    } catch (err) { console.error("[AI] OpenAI failed:", err); }
  }

  // 3. Gemini — all keys × both models
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];

  for (const key of geminiKeys) {
    for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: maxTokens, responseMimeType: "application/json" },
            }),
          }
        );
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.length > 20) return text;
      } catch (err) { console.error(`[AI] Gemini (${model}) failed:`, err); }
    }
  }

  // 4. OpenRouter — free Llama fallback
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://shadecodestudent.vercel.app",
          "X-Title": "Shadecode Student",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text && text.length > 20) return text;
    } catch (err) { console.error("[AI] OpenRouter failed:", err); }
  }

  console.error("[AI] All providers exhausted.");
  return null;
}

// ── Prompt ────────────────────────────────────────────────────────────────────

function buildLessonPrompt(subject: string, topic: string, difficulty: string): string {
  const diffGuide = {
    easy:   "Use very simple language. Break every concept into small steps. Assume the student is new to this topic.",
    medium: "Use standard A-Level language and pace. Assume the student has basic knowledge of the subject.",
    hard:   "Use challenging, exam-ready content. Include edge cases, common exam traps, and higher-order thinking.",
  }[difficulty] ?? "Use standard A-Level language and pace.";

  return `You are an expert ${subject} teacher. Create a structured A-Level lesson on: "${topic}"

Difficulty level: ${difficulty.toUpperCase()} — ${diffGuide}

Return ONLY a valid JSON object. No markdown, no code fences, no commentary before or after.

{
  "title": "Lesson title here",
  "blocks": [
    { "type": "text",    "content": "Clear explanation in plain English." },
    { "type": "example","content": "Worked example with steps shown." },
    { "type": "math",   "content": "Equation using plain notation, e.g: sin(θ) = opposite/hypotenuse" },
    { "type": "tip",    "content": "Key exam tip or common mistake to avoid." }
  ]
}

STRICT RULES:
- Output ONLY the JSON object. Nothing before or after it.
- Include at least: 2 text blocks, 1 example block, 1 math block, 1 tip block.
- For math: use plain readable notation with Unicode symbols (θ, π, √, ², ³, ×, ÷, ±, ≤, ≥, ≠, ∞, ∑, ∫, Δ).
- Do NOT use LaTeX backslash commands like \\sin, \\frac, \\theta — they break JSON.
- Do NOT use markdown formatting inside content strings.
- All strings must be properly JSON-escaped.`;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url       = new URL(req.url);
    const subjectId = url.searchParams.get("subjectId") ?? "all";
    const lessonId  = url.searchParams.get("lessonId");
    const { supabase, user } = auth;

    const [{ data: profileData }, { data: subjectsData, error: subjectsError }] = await Promise.all([
      supabase.from("profiles").select("xp, streak, level").eq("id", user.id).maybeSingle(),
      supabase.from("subjects").select("id, name").eq("user_id", user.id).order("name", { ascending: true }),
    ]);

    if (subjectsError) console.error("Subjects query error:", subjectsError);

    const subjects    = (subjectsData ?? []) as SubjectRow[];
    const subjectById = new Map(subjects.map(s => [s.id, s.name]));
    const profile     = profileData as ProfileRow | null;
    const level       = profile?.level ?? 1;

    const summary = {
      currentXP:     profile?.xp ?? 0,
      currentStreak: profile?.streak ?? 0,
      level,
      xpGoal: Math.max(100, level * 100),
    };

    if (lessonId) {
      const { data: lessonData, error: lessonError } = await supabase
        .from("learn_lessons")
        .select("id, subject_id, title, description, difficulty, progress, updated_at, blocks")
        .eq("user_id", user.id)
        .eq("id", lessonId)
        .maybeSingle();

      if (lessonError) {
        console.error("Lesson detail error:", lessonError);
        return NextResponse.json({ error: "Unable to load lesson." }, { status: 500 });
      }
      if (!lessonData) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });

      const response: LearnDetailResponse = { lesson: toLearnLesson(lessonData as LearnLessonRow, subjectById) };
      return NextResponse.json(response);
    }

    const { data: allLessonData, error: allLessonsError } = await supabase
      .from("learn_lessons")
      .select("id, subject_id, title, description, difficulty, progress, updated_at, blocks")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (allLessonsError) {
      console.error("learn_lessons query error:", allLessonsError);
      return NextResponse.json({ subjects: buildSubjectTabs(subjects, []), lessons: [], summary });
    }

    const allLessons = (allLessonData ?? []) as LearnLessonRow[];
    const filtered   = subjectId === "all" ? allLessons : allLessons.filter(l => l.subject_id === subjectId);

    const response: LearnListResponse = {
      subjects: buildSubjectTabs(subjects, allLessons),
      lessons:  filtered.map(l => toLearnLesson(l, subjectById)),
      summary,
    };
    return NextResponse.json(response);

  } catch (err) {
    console.error("Learn GET error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supabase, user } = auth;
    const body = await req.json();
    const { type, subject, topic, difficulty, goal, level } = body;

    // Support creating a single lesson or generating a full course
    if (type === "course_preview") {
      if (!topic || !goal) return NextResponse.json({ error: "Missing topic or goal" }, { status: 400 });
      try {
        const token = getBearerToken(req);
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { generateCourseDraft } = await import('@/lib/cortex/generateCourse');
        const draft = await generateCourseDraft(token, { topic, goal, level });
        return NextResponse.json({ success: true, draft });
      } catch (e) {
        console.error('[learn] course preview error:', e);
        return NextResponse.json({ error: 'Course preview failed' }, { status: 500 });
      }
    }

    if (type === "course") {
      if (!topic || !goal) return NextResponse.json({ error: "Missing topic or goal" }, { status: 400 });
      // Delegate to cortex generator utility
      try {
        const token = getBearerToken(req);
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { generateCourseForUser } = await import('@/lib/cortex/generateCourse');
        const result = await generateCourseForUser(token, { topic, goal, level });
        return NextResponse.json({ success: true, course: result });
      } catch (e) {
        console.error('[learn] course generation error:', e);
        return NextResponse.json({ error: 'Course generation failed' }, { status: 500 });
      }
    }

    if (type !== "lesson") return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    if (!subject || !topic) return NextResponse.json({ error: "Missing subject or topic" }, { status: 400 });

    // Validate difficulty
    const validDifficulty = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium";

    const prompt = buildLessonPrompt(subject, topic, validDifficulty);
    const raw    = await callAI(prompt);

    if (!raw) {
      return NextResponse.json({
        title:  `${topic} — Lesson Unavailable`,
        blocks: [{ type: "text", content: "All AI providers are currently unavailable. Please try again in a moment." }],
      });
    }

    const parsed = safeParseJSON(raw);

    if (!parsed?.blocks?.length) {
      return NextResponse.json({
        title:  topic,
        blocks: [{ type: "text", content: "The AI returned content that couldn't be parsed. Please try again or rephrase the topic." }],
      });
    }

    // Find subject_id
    const { data: subjectRow } = await supabase
      .from("subjects")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", subject)
      .maybeSingle();

    let savedId: string | null = null;

    if (subjectRow?.id) {
      const { data: inserted, error: insertError } = await supabase
        .from("learn_lessons")
        .insert({
          user_id:     user.id,
          subject_id:  subjectRow.id,
          title:       parsed.title ?? topic,
          description: `AI-generated ${validDifficulty} lesson on ${topic}`,
          difficulty:  validDifficulty,
          progress:    0,
          blocks:      parsed.blocks,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Failed to save lesson:", insertError);
      } else {
        savedId = inserted.id;
        // XP scales with difficulty
        const xpAmount = validDifficulty === "hard" ? 30 : validDifficulty === "medium" ? 25 : 20;
        try { await supabase.rpc("increment_xp", { user_id: user.id, amount: xpAmount }); } catch {}
      }
    }

    return NextResponse.json({ id: savedId, title: parsed.title ?? topic, blocks: parsed.blocks });

  } catch (err) {
    console.error("Learn POST error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// ── PATCH — update lesson progress ───────────────────────────────────────────

export async function PATCH(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supabase, user } = auth;
    const { lessonId, progress } = await req.json();

    if (!lessonId || typeof progress !== "number") {
      return NextResponse.json({ error: "Missing lessonId or progress" }, { status: 400 });
    }

    const clamped = Math.min(100, Math.max(0, Math.round(progress)));

    const { error: updateError } = await supabase
      .from("learn_lessons")
      .update({ progress: clamped, updated_at: new Date().toISOString() })
      .eq("id", lessonId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Progress update error:", updateError);
      return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
    }

    if (clamped === 100) {
      try { await supabase.rpc("increment_xp", { user_id: user.id, amount: 35 }); } catch {}
    }

    return NextResponse.json({ success: true, progress: clamped });

  } catch (err) {
    console.error("Learn PATCH error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
