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
} from "@/app/learn/types";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

interface SubjectRow   { id: string; name: string; }
interface ProfileRow   { xp: number | null; streak: number | null; level: number | null; }
interface LessonBlock  { type: string; content: string; }
interface LearnLessonRow {
  id: string; subject_id: string; title: string;
  description: string | null; difficulty: string | null;
  progress: number | null; updated_at: string | null;
  blocks: LessonBlock[] | null;
}
interface AuthContext { supabase: SupabaseClient; user: User; }

// ── Supabase admin ────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase credentials.");
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
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

function normalizeDifficulty(value: string | null): LessonDifficulty {
  if (value === "medium" || value === "hard") return value;
  return "easy";
}

function clampProgress(value: number | null): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function toLearnLesson(row: LearnLessonRow, subjectById: Map<string, string>) {
  const progress = clampProgress(row.progress);
  return {
    id:          row.id,
    subjectId:   row.subject_id,
    subject:     subjectById.get(row.subject_id) ?? "Unknown",
    title:       row.title,
    description: row.description ?? "",
    difficulty:  normalizeDifficulty(row.difficulty),
    progress,
    completed:   progress >= 100,
    updated_at:  row.updated_at ?? undefined,
    blocks:      row.blocks ?? undefined,
  } as LearnLesson & { updated_at?: string; blocks?: LessonBlock[] };
}

function buildSubjectTabs(subjects: SubjectRow[], lessons: LearnLessonRow[]): LearnSubject[] {
  const counts = lessons.reduce<Record<string, number>>((acc, l) => {
    acc[l.subject_id] = (acc[l.subject_id] ?? 0) + 1;
    return acc;
  }, {});
  return subjects.map(s => ({ id: s.id, name: s.name, lessonCount: counts[s.id] ?? 0 }));
}

// ── Prompt ───────────────────────────────────────────────────────────────────
// KEY RULE: NO LaTeX backslashes. Plain text math only.
// This prevents JSON parse failures on topics like trig, calculus, etc.

function buildLessonPrompt(subject: string, topic: string): string {
  return `You are an expert ${subject} tutor creating a structured A-Level lesson.

Topic: "${topic}"

Return ONLY a valid JSON object. No markdown, no code fences, no extra text.

CRITICAL JSON RULES:
- Use double quotes for all strings
- NO backslashes except for \\n inside string values
- NO LaTeX (no \\frac, \\sin, \\theta etc.)
- Write math in plain text: use ^ for powers, / for fractions, words for Greek letters
- Examples of safe math notation:
    sin(x), cos(theta), tan(x)
    x^2 + 5x - 6 = 0
    dy/dx = 2x
    (a + b)^2 = a^2 + 2ab + b^2
    f(x) = x^3 - 3x + 2
    sum from n=1 to infinity of 1/n^2

Required JSON format:
{
  "title": "Lesson title here",
  "blocks": [
    {"type": "text",    "content": "Introduction or explanation paragraph"},
    {"type": "text",    "content": "Second explanation paragraph"},
    {"type": "example", "content": "Step 1: ... Step 2: ... Step 3: ..."},
    {"type": "math",    "content": "key formula in plain text e.g. sin^2(x) + cos^2(x) = 1"},
    {"type": "tip",     "content": "Exam tip or common mistake to avoid"}
  ]
}

Include at least: 2 text blocks, 1 example, 1 math block, 1 tip block.
Keep explanations clear and concise for A-Level students.
Output ONLY the JSON object, nothing else.`;
}

// ── Robust JSON parser ────────────────────────────────────────────────────────
// Handles: markdown fences, unescaped backslashes, extra text before/after JSON

function safeParseJSON(raw: string): { title: string; blocks: LessonBlock[] } | null {
  if (!raw?.trim()) return null;

  // 1. Strip markdown code fences
  let text = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/,        "")
    .trim();

  // 2. Extract the first {...} block
  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  text = text.slice(start, end + 1);

  // 3. Try direct parse first
  try {
    const parsed = JSON.parse(text);
    if (isValidLesson(parsed)) return parsed;
  } catch {}

  // 4. Fix unescaped backslashes inside string values
  //    Replace lone backslashes (not already escaped) with empty string
  //    This handles LaTeX that slipped through despite the prompt
  const cleaned = text.replace(
    /"((?:[^"\\]|\\.)*)"/g,
    (_match, inner: string) => {
      // Remove LaTeX commands entirely: \sin -> sin, \frac -> frac, etc.
      const fixed = inner
        .replace(/\\([a-zA-Z]+)/g, "$1")   // \sin -> sin, \frac -> frac
        .replace(/\\([^"\\nrtbfu])/g, "$1") // other lone backslashes
        .replace(/\{/g, "(")               // { -> (
        .replace(/\}/g, ")")               // } -> )
        .trim();
      return `"${fixed}"`;
    }
  );

  try {
    const parsed = JSON.parse(cleaned);
    if (isValidLesson(parsed)) return parsed;
  } catch {}

  // 5. Last resort: manually extract title + blocks with regex
  try {
    const titleMatch  = cleaned.match(/"title"\s*:\s*"([^"]+)"/);
    const blocksMatch = cleaned.match(/"blocks"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);

    if (titleMatch && blocksMatch) {
      const blocks = JSON.parse(blocksMatch[1]) as LessonBlock[];
      if (Array.isArray(blocks)) {
        return { title: titleMatch[1], blocks };
      }
    }
  } catch {}

  return null;
}

function isValidLesson(obj: unknown): obj is { title: string; blocks: LessonBlock[] } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as any).title === "string" &&
    Array.isArray((obj as any).blocks) &&
    (obj as any).blocks.length > 0
  );
}

// ── Full AI provider chain ────────────────────────────────────────────────────
// Order: Cloudflare → OpenAI → Gemini 2.0 Flash (3 keys) →
//        Gemini 2.5 Flash (3 keys) → OpenRouter

async function callAI(prompt: string, maxTokens = 2500): Promise<string | null> {

  // ── 1. Cloudflare Workers AI ─────────────────────────────────────────────
  if (process.env.CLOUDFLARE_API_TOKEN) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens,
          }),
        }
      );
      const data = await res.json();
      const text = data?.result?.response;
      if (typeof text === "string" && text.trim()) {
        console.log("✓ Cloudflare succeeded");
        return text;
      }
    } catch (err) { console.error("Cloudflare failed:", err); }
  }

  // ── 2. OpenAI GPT-4o-mini ────────────────────────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens,
          response_format: { type: "json_object" }, // forces valid JSON
        }),
      });
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text?.trim()) {
        console.log("✓ OpenAI succeeded");
        return text;
      }
    } catch (err) { console.error("OpenAI failed:", err); }
  }

  // ── 3. Gemini — try all keys × two models ────────────────────────────────
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter((k): k is string => !!k);

  const geminiModels = ["gemini-2.0-flash", "gemini-2.5-flash"];

  for (const model of geminiModels) {
    for (const key of geminiKeys) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: 0.4,
              },
            }),
          }
        );
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text?.trim()) {
          console.log(`✓ Gemini ${model} succeeded`);
          return text;
        }
      } catch (err) { console.error(`Gemini ${model} failed:`, err); }
    }
  }

  // ── 4. OpenRouter (free Llama fallback) ──────────────────────────────────
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
      const text = data?.choices?.[0]?.message?.content;
      if (text?.trim()) {
        console.log("✓ OpenRouter succeeded");
        return text;
      }
    } catch (err) { console.error("OpenRouter failed:", err); }
  }

  console.error("✗ All AI providers exhausted");
  return null;
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

    const [{ data: profileData }, { data: subjectsData, error: subjectsError }] =
      await Promise.all([
        supabase.from("profiles").select("xp, streak, level").eq("id", user.id).maybeSingle(),
        supabase.from("subjects").select("id, name").eq("user_id", user.id).order("name", { ascending: true }),
      ]);

    if (subjectsError) console.error("Subjects error:", subjectsError);

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

    // Single lesson
    if (lessonId) {
      const { data: lessonData, error: lessonError } = await supabase
        .from("learn_lessons")
        .select("id, subject_id, title, description, difficulty, progress, updated_at, blocks")
        .eq("user_id", user.id)
        .eq("id", lessonId)
        .maybeSingle();

      if (lessonError) return NextResponse.json({ error: "Unable to load lesson." }, { status: 500 });
      if (!lessonData)  return NextResponse.json({ error: "Lesson not found." },     { status: 404 });

      return NextResponse.json({ lesson: toLearnLesson(lessonData as LearnLessonRow, subjectById) } as LearnDetailResponse);
    }

    // Lesson list
    const { data: allLessonData, error: allLessonsError } = await supabase
      .from("learn_lessons")
      .select("id, subject_id, title, description, difficulty, progress, updated_at, blocks")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (allLessonsError) {
      console.error("learn_lessons error:", allLessonsError);
      return NextResponse.json({ subjects: buildSubjectTabs(subjects, []), lessons: [], summary });
    }

    const allLessons = (allLessonData ?? []) as LearnLessonRow[];
    const filtered   = subjectId === "all" ? allLessons : allLessons.filter(l => l.subject_id === subjectId);

    return NextResponse.json({
      subjects: buildSubjectTabs(subjects, allLessons),
      lessons:  filtered.map(l => toLearnLesson(l, subjectById)),
      summary,
    } as LearnListResponse);

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
    const { type, subject, topic } = await req.json();

    if (type !== "lesson") return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    if (!subject || !topic)  return NextResponse.json({ error: "Missing subject or topic" }, { status: 400 });

    // Generate with full provider chain
    const raw = await callAI(buildLessonPrompt(subject, topic));

    if (!raw) {
      return NextResponse.json({
        title:  "AI Unavailable",
        blocks: [{ type: "text", content: "All AI providers are currently unavailable. Please try again in a moment." }],
      });
    }

    // Robust parse — handles LaTeX escaping issues
    const parsed = safeParseJSON(raw);

    if (!parsed) {
      console.error("Failed to parse AI response:", raw.slice(0, 300));
      return NextResponse.json({
        title:  topic,
        blocks: [{ type: "text", content: "The lesson couldn't be structured properly. Please try again or rephrase the topic." }],
      });
    }

    // Find subject_id and save
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
          title:       parsed.title,
          description: `AI-generated lesson on ${topic}`,
          difficulty:  "medium",
          progress:    0,
          blocks:      parsed.blocks,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Failed to save lesson:", insertError);
      } else {
        savedId = inserted.id;
        try { await supabase.rpc("increment_xp", { user_id: user.id, amount: 25 }); } catch {}
      }
    }

    return NextResponse.json({ id: savedId, title: parsed.title, blocks: parsed.blocks });

  } catch (err) {
    console.error("Learn POST error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// ── PATCH — update lesson progress ────────────────────────────────────────────

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
