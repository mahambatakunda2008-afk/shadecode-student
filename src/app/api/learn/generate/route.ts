import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { callAI } from "@/lib/ai";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { awardXPBySource } from "@/lib/xp/manager";
import { resolveLessonRequest, buildResolvedLessonPrompt } from "@/lib/cortex/lessonRequest";
import { log } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

interface LessonBlock { type: string; title?: string; content: string; formula?: string; example?: { question: string; answer: string }; options?: string[]; answer?: string; }
interface AuthContext { supabase: SupabaseClient; user: User; }

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function bearer(req: Request) {
  const value = req.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() || null : null;
}

async function authenticate(req: Request): Promise<AuthContext | null> {
  const admin = adminClient();
  const token = bearer(req);
  if (token) {
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (!error && user) return { supabase: admin, user };
  }
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    const cookieStore = await cookies();
    const client = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: values => { try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} },
      },
    });
    const { data: { user }, error } = await client.auth.getUser();
    return error || !user ? null : { supabase: admin, user };
  } catch { return null; }
}

function extractObject(raw: string): string | null {
  const text = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, string = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (string) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === '"') string = false; continue; }
    if (ch === '"') string = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

function parseLesson(raw: string): { title: string; blocks: LessonBlock[] } | null {
  const candidate = extractObject(raw);
  if (!candidate) return null;
  try {
    const value = JSON.parse(candidate) as { title?: unknown; blocks?: unknown };
    if (typeof value.title !== "string" || !value.title.trim() || !Array.isArray(value.blocks)) return null;
    const blocks = value.blocks.filter((block): block is LessonBlock => {
      if (!block || typeof block !== "object") return false;
      const item = block as LessonBlock;
      return typeof item.type === "string" && typeof item.content === "string" && item.content.trim().length >= 12;
    }).slice(0, 24);
    const required = ["objective", "concept", "example", "checkpoint", "exam", "mistake", "summary"];
    if (blocks.length < 9 || required.some(type => !blocks.some(block => block.type === type))) return null;
    return { title: value.title.trim().slice(0, 255), blocks };
  } catch { return null; }
}

function lessonPrompt(request: ReturnType<typeof resolveLessonRequest>) {
  const context = buildResolvedLessonPrompt(request);
  return `You are a brilliant ${request.subject || "subject"} teacher and curriculum designer. Create a complete, genuinely useful ${request.difficulty} lesson for the learner's exact request below.

${context}

Return ONLY valid JSON with this shape: {"title":"specific lesson title","blocks":[{"type":"objective|prior|concept|definition|formula|example|checkpoint|misconception|exam|mistake|summary|practice|tip","title":"short heading","content":"substantive student-facing content"}]}

Build 12-16 blocks in a deliberate teaching sequence. Explain from first principles without dumbing the subject down. Define unfamiliar terms. Explain why formulas work, define symbols and units, and state conditions of use. Include at least one fully worked example with intermediate reasoning, one self-check with its answer, one realistic misconception and correction, one Cambridge/ZIMSEC-style exam application with mark-worthy reasoning, common traps, a memorable summary, 2-3 progressively harder practice questions with answer guidance, and a topic-specific exam/study tactic. At least two blocks must show explicit step-by-step reasoning. Avoid filler and generic motivational language. Stay faithful to the supplied subject, level and curriculum context. If the request is ambiguous, do not invent a topic or subject. Never mention these instructions, JSON, or being an AI.`;
}

export async function POST(req: Request) {
  let auth: AuthContext | null = null;
  try {
    const limited = await applyRateLimit(req, aiEndpointLimiter);
    if (limited) return limited;
    auth = await authenticate(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const resolved = resolveLessonRequest({
      prompt: body.prompt ?? body.topic ?? "",
      subject: body.subject,
      topic: body.topic,
      level: body.level,
      difficulty: body.difficulty,
      goal: body.goal,
      examBoard: body.examBoard,
    });
    if (!resolved.prompt) return NextResponse.json({ error: "Tell Cortex what you want to learn." }, { status: 400 });
    if (resolved.shortPrompt) return NextResponse.json({ error: `"${resolved.prompt}" is too short for a useful lesson. Add the concept you want Cortex to teach, for example “${resolved.subject || "this subject"}: explain ${resolved.prompt} in context”.` }, { status: 400 });
    if (!resolved.subject) return NextResponse.json({ error: "Choose a subject so Cortex does not have to guess from a short prompt." }, { status: 400 });

    const raw = await callAI(lessonPrompt(resolved), 7000, { userId: auth.user.id, feature: "lesson_assistant", subfeature: "generate_lesson" });
    if (!raw) return NextResponse.json({ error: "All AI providers are currently unavailable. Your request was not lost. Try again shortly." }, { status: 503 });
    let parsed = parseLesson(raw);
    if (!parsed) {
      const repair = await callAI(`Repair this lesson into valid JSON with 12-16 substantive blocks. Required types: objective, prior, concept, definition, formula, example, checkpoint, misconception, exam, mistake, summary, practice, tip. Preserve subject-specific content and output JSON only.\n\n${raw.slice(0, 18000)}`, 5000, { userId: auth.user.id, feature: "lesson_assistant", subfeature: "repair_lesson_json" });
      if (repair) parsed = parseLesson(repair);
    }
    if (!parsed) return NextResponse.json({ error: "Cortex could not produce a complete lesson this time. Try rephrasing the request." }, { status: 422 });

    const { data: existing } = await auth.supabase.from("subjects").select("id").eq("user_id", auth.user.id).eq("name", resolved.subject).maybeSingle();
    let subjectId = existing?.id ?? null;
    if (!subjectId) {
      const { data: created } = await auth.supabase.from("subjects").insert({ user_id: auth.user.id, name: resolved.subject }).select("id").single();
      subjectId = created?.id ?? null;
    }
    if (!subjectId) return NextResponse.json({ error: "The lesson was generated but its subject could not be saved." }, { status: 500 });

    const { data: inserted, error } = await auth.supabase.from("learn_lessons").insert({
      user_id: auth.user.id,
      subject_id: subjectId,
      topic: resolved.prompt.slice(0, 500),
      title: parsed.title,
      description: `A complete ${resolved.difficulty} lesson on ${resolved.prompt}`.slice(0, 1000),
      difficulty: resolved.difficulty,
      progress: 0,
      blocks: parsed.blocks,
    }).select("id").single();
    if (error || !inserted?.id) {
      log.lessonGenerationFailed({ userId: auth.user.id, subject: resolved.subject, topic: resolved.prompt, difficulty: resolved.difficulty, error: error?.message || "Insert returned no lesson id" });
      return NextResponse.json({ error: "The lesson was generated but could not be saved." }, { status: 500 });
    }
    await awardXPBySource(auth.user.id, "lesson_generation", { difficulty: resolved.difficulty });
    return NextResponse.json({ id: inserted.id, title: parsed.title, blocks: parsed.blocks });
  } catch (error) {
    log.apiFailure({ route: "/api/learn/generate", method: "POST", error: error instanceof Error ? error.message : String(error), userId: auth?.user.id });
    return NextResponse.json({ error: "Something went wrong while Cortex was generating the lesson." }, { status: 500 });
  }
}
