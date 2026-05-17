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

interface SubjectRow {
  id: string;
  name: string;
}

interface ProfileRow {
  xp: number | null;
  streak: number | null;
  level: number | null;
}

interface LessonBlock {
  type: string;
  content: string;
}

interface LearnLessonRow {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  progress: number | null;
  updated_at: string | null;
  blocks: LessonBlock[] | null;
}

interface AuthContext {
  supabase: SupabaseClient;
  user: User;
}

// ── Supabase admin ────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
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

function toLearnLesson(row: LearnLessonRow, subjectById: Map<string, string>): LearnLesson & { updated_at?: string; blocks?: LessonBlock[] } {
  const progress = clampProgress(row.progress);
  return {
    id: row.id,
    subjectId: row.subject_id,
    subject: subjectById.get(row.subject_id) ?? "Unknown subject",
    title: row.title,
    description: row.description ?? "",
    difficulty: normalizeDifficulty(row.difficulty),
    progress,
    completed: progress >= 100,
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

// ── AI providers ──────────────────────────────────────────────────────────────

async function callAI(prompt: string, maxTokens = 2000): Promise<string | null> {
  // 1. Cloudflare
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
      return typeof data?.result?.response === "string" ? data.result.response : JSON.stringify(data?.result?.response || "");
    } catch (err) { console.error("Cloudflare failed:", err); }
  }

  // 2. OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: maxTokens }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) { console.error("OpenAI failed:", err); }
  }

  // 3. Gemini
  const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3].filter(Boolean);
  for (const key of geminiKeys) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: maxTokens } }),
        }
      );
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) { console.error("Gemini failed:", err); }
  }

  return null;
}

function buildLessonPrompt(subject: string, topic: string) {
  return `
You are an expert ${subject} teacher creating a structured A-Level lesson.

Topic: "${topic}"

Return ONLY valid JSON in this format:

{
  "title": "string",
  "blocks": [
    { "type": "text",    "content": "clear explanation" },
    { "type": "example", "content": "worked example step-by-step" },
    { "type": "math",    "content": "LaTeX equation ONLY" },
    { "type": "tip",     "content": "important exam tip" }
  ]
}

RULES:
- Use SIMPLE, clear English
- Include at least: 2 text blocks, 1 example, 1 math block, 1 tip block
- Math MUST be valid LaTeX (e.g. x^2 - 5x + 6 = 0)
- Do NOT include markdown
- Do NOT include commentary
- Output ONLY JSON
`;
}

function safeParseJSON(text: string) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch { return null; }
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const subjectId = url.searchParams.get("subjectId") ?? "all";
    const lessonId  = url.searchParams.get("lessonId");
    const { supabase, user } = auth;

    const [{ data: profileData }, { data: subjectsData, error: subjectsError }] = await Promise.all([
      supabase.from("profiles").select("xp, streak, level").eq("id", user.id).maybeSingle(),
      supabase.from("subjects").select("id, name").eq("user_id", user.id).order("name", { ascending: true }),
    ]);

    if (subjectsError) console.error("Subjects query error:", subjectsError);

    const subjects   = (subjectsData ?? []) as SubjectRow[];
    const subjectById = new Map(subjects.map(s => [s.id, s.name]));
    const profile    = profileData as ProfileRow | null;
    const level      = profile?.level ?? 1;

    const summary = {
      currentXP:     profile?.xp ?? 0,
      currentStreak: profile?.streak ?? 0,
      level,
      xpGoal: Math.max(100, level * 100),
    };

    // Single lesson detail
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

      const response: LearnDetailResponse = {
        lesson: toLearnLesson(lessonData as LearnLessonRow, subjectById),
      };
      return NextResponse.json(response);
    }

    // Lesson list
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
    // Authenticate
    const auth = await authenticateRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supabase, user } = auth;
    const body = await req.json();
    const { type, subject, topic } = body;

    if (type !== "lesson") return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    if (!subject || !topic)  return NextResponse.json({ error: "Missing subject or topic" }, { status: 400 });

    // Generate
    const prompt = buildLessonPrompt(subject, topic);
    const raw    = await callAI(prompt);

    if (!raw) {
      return NextResponse.json({
        title: "Unavailable",
        blocks: [{ type: "text", content: "AI is currently unavailable. Please try again." }],
      });
    }

    const parsed = safeParseJSON(raw);

    if (!parsed?.blocks) {
      return NextResponse.json({
        title: topic,
        blocks: [{ type: "text", content: "Failed to generate structured lesson. Try again." }],
      });
    }

    // Find subject_id
    const { data: subjectRow } = await supabase
      .from("subjects")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", subject)
      .maybeSingle();

    // Save to DB
    let savedId: string | null = null;

    if (subjectRow?.id) {
      const { data: inserted, error: insertError } = await supabase
        .from("learn_lessons")
        .insert({
          user_id:    user.id,
          subject_id: subjectRow.id,
          title:      parsed.title ?? topic,
          description: `AI-generated lesson on ${topic}`,
          difficulty: "medium",
          progress:   0,
          blocks:     parsed.blocks,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Failed to save lesson:", insertError);
      } else {
        savedId = inserted.id;

        // Award XP (25 for generating a lesson)
        try { await supabase.rpc("increment_xp", { user_id: user.id, amount: 25 }); } catch {}
      }
    }

    return NextResponse.json({
      id:     savedId,
      title:  parsed.title ?? topic,
      blocks: parsed.blocks,
    });

  } catch (err) {
    console.error("Learn POST error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
