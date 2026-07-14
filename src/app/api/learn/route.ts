import { NextResponse } from "next/server";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { log } from "@/lib/observability";

import type {
  LearnDetailResponse,
  LearnLesson,
  LearnListResponse,
  LearnSubject,
  LessonDifficulty,
} from "@/app/(app)/learn/types";

import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { 
  learnCoursePreviewSchema,
  learnGenerateLessonSchema,
  validateRequestBody 
} from '@/lib/validation/schemas';
import { callAI } from "@/lib/ai";
import { awardXPBySource } from "@/lib/xp/manager";


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

// ── AI providers ── consolidated into @/lib/ai (see callAI import above) ──

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
  let auth: any = null;
  try {
    auth = await authenticateRequest(req);
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

  } catch (err: any) {
    console.error("Learn GET error:", err);
    log.apiFailure({ route: "/api/learn", method: "GET", error: err.message || String(err), userId: auth?.user?.id });
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let auth: any = null;
  try {
    // Apply rate limiting for AI-powered endpoint
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck;

    auth = await authenticateRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supabase, user } = auth;
    const body = await req.json();
    const { type, subject, topic, difficulty, goal, level } = body;

    // Validate request body based on type
    if (type === "course_preview") {
      const validation = validateRequestBody({ topic, goal, level }, learnCoursePreviewSchema);
      if (!validation.success) {
        return NextResponse.json({ 
          error: 'Validation failed', 
          details: validation.details?.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        }, { status: 400 });
      }
    } else if (type === "generate_lesson") {
      const validation = validateRequestBody({ subject, topic, difficulty }, learnGenerateLessonSchema);
      if (!validation.success) {
        return NextResponse.json({ 
          error: 'Validation failed', 
          details: validation.details?.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message }))
        }, { status: 400 });
      }
    }

    // Support creating a single lesson or generating a full course
    if (type === "course_preview") {
      if (!topic || !goal) return NextResponse.json({ error: "Missing topic or goal" }, { status: 400 });
      try {
        const token = getBearerToken(req);
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { generateCourseDraft } = await import('@/lib/cortex/generateCourse');
        const draft = await generateCourseDraft(token, { topic, goal, level });

        return NextResponse.json({ success: true, draft });
      } catch (e: any) {
        console.error('[learn] course preview error:', e);
        log.cortexFailure({ userId: user.id, stage: "course_preview", error: e.message || String(e) });
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
      } catch (e: any) {
        console.error('[learn] course generation error:', e);
        log.cortexFailure({ userId: user.id, stage: "course_generation", error: e.message || String(e) });
        return NextResponse.json({ error: 'Course generation failed' }, { status: 500 });
      }
    }

    if (type === "course_save") {
      // Persist a user-provided draft (from preview) into learn_lessons and lesson_prerequisites
      const draft = body.draft;
      if (!draft || !Array.isArray(draft.lessons) || draft.lessons.length === 0) {
        return NextResponse.json({ error: 'Invalid draft' }, { status: 400 });
      }

      // Find or create subject for this topic
      const subjName = topic && topic.length > 0 && topic.length <= 60 ? topic : (draft.title ?? `Course: ${topic}`);
      let subjectId: string | null = null;
      try {
        const { data: existing } = await supabase.from('subjects').select('id').eq('user_id', user.id).eq('name', subjName).maybeSingle();
        if (existing?.id) subjectId = existing.id;
        else {
          const { data: insertedSub, error: insertSubErr } = await supabase.from('subjects').insert({ user_id: user.id, name: subjName }).select('id').single();
          if (insertSubErr) console.error('Failed to create subject:', insertSubErr);
          subjectId = insertedSub?.id ?? null;
        }
      } catch (e) { console.error('[learn] subject creation error:', e); }

      if (!subjectId) return NextResponse.json({ error: 'Failed to resolve subject' }, { status: 500 });

      // Prepare lessons
      const lessonsToInsert = draft.lessons.map((l: any) => ({
        user_id: user.id,
        subject_id: subjectId,
        title: (l.title ?? l.summary ?? 'Untitled').toString().slice(0,255),
        description: (l.summary ?? '').toString().slice(0,1000),
        difficulty: (l.difficulty === 'hard' ? 'hard' : l.difficulty === 'medium' ? 'medium' : 'easy'),
        blocks: Array.isArray(l.blocks) ? l.blocks : [{ type: 'text', content: l.summary ?? '' }],
        progress: 0,
      }));

      const { data: insertedLessons, error: insertLessonsError } = await supabase.from('learn_lessons').insert(lessonsToInsert).select('id, title');
      if (insertLessonsError) console.error('Failed to insert lessons:', insertLessonsError);

      const titleToId = new Map();
      (insertedLessons ?? []).forEach((r: any) => titleToId.set(r.title, r.id));

      // Insert prerequisites mapping by matching titles to created IDs
      const prereqInserts: any[] = [];
      const unmappedPrereqs: Array<{ lessonTitle: string; missingPrereq: string }> = [];

      for (const l of draft.lessons) {
        const lessonTitleKey = (l.title ?? l.summary ?? '').toString().slice(0,255);
        const insertedId = titleToId.get(lessonTitleKey);
        if (!insertedId) continue;
        const prereqs = Array.isArray(l.prerequisites) ? l.prerequisites : [];
        for (const pTitle of prereqs) {
          const pKey = pTitle.toString().slice(0,255);
          const pid = titleToId.get(pKey);
          if (pid && pid !== insertedId) {
            prereqInserts.push({ lesson_id: insertedId, prerequisite_lesson_id: pid });
          } else {
            unmappedPrereqs.push({ lessonTitle: lessonTitleKey, missingPrereq: pKey });
          }
        }
      }

      // Deduplicate inserts
      const seen = new Set<string>();
      const deduped: any[] = [];
      for (const r of prereqInserts) {
        const k = `${r.lesson_id}:${r.prerequisite_lesson_id}`;
        if (!seen.has(k)) { seen.add(k); deduped.push(r); }
      }

      if (deduped.length > 0) {
        try {
          await supabase.from('lesson_prerequisites').insert(deduped);
        } catch (e) { console.error('prereq insert error:', e); }
      }

      // Optionally create/update learning path
      try {
        await supabase.from('learning_paths').upsert({ user_id: user.id, title: draft.title ?? subjName, description: draft.description ?? '', updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      } catch (e) { }

      return NextResponse.json({ success: true, lessonsInserted: (insertedLessons ?? []).length, unmappedPrereqs });
    }

    if (type !== "lesson") return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    if (!subject || !topic) return NextResponse.json({ error: "Missing subject or topic" }, { status: 400 });

    // Validate difficulty
    const validDifficulty = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium";

    const prompt = buildLessonPrompt(subject, topic, validDifficulty);
    const raw    = await callAI(prompt, 2000, { userId: user.id, feature: "lesson_assistant", subfeature: "generate_lesson" });

    if (!raw) {
      log.lessonGenerationFailed({
        userId: user.id,
        subject,
        topic,
        difficulty: validDifficulty,
        error: "All AI providers exhausted",
      });
      return NextResponse.json({
        title:  `${topic} — Lesson Unavailable`,
        blocks: [{ type: "text", content: "All AI providers are currently unavailable. Please try again in a moment." }],
      });
    }

    const parsed = safeParseJSON(raw);

    if (!parsed?.blocks?.length) {
      log.lessonGenerationFailed({
        userId: user.id,
        subject,
        topic,
        difficulty: validDifficulty,
        error: `AI returned invalid JSON: ${raw.slice(0, 300)}`,
      });
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
        log.lessonGenerationFailed({
          userId: user.id,
          subject,
          topic,
          difficulty: validDifficulty,
          error: `Failed to save generated lesson to DB: ${insertError.message}`,
        });
      } else {
        savedId = inserted.id;
        // Award XP using centralized manager
        await awardXPBySource(user.id, "lesson_generation", { difficulty: validDifficulty });
      }
    }

    return NextResponse.json({ id: savedId, title: parsed.title ?? topic, blocks: parsed.blocks });

  } catch (err: any) {
    console.error("Learn POST error:", err);
    log.apiFailure({ route: "/api/learn", method: "POST", error: err.message || String(err), userId: auth?.user?.id });
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
      // Award XP for lesson completion using centralized manager
      await awardXPBySource(user.id, "lesson_completion");
    }

    return NextResponse.json({ success: true, progress: clamped });

  } catch (err) {
    console.error("Learn PATCH error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
