import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { callAI } from "@/lib/ai";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { awardXPBySource } from "@/lib/xp/manager";
import { resolveLessonRequest, buildResolvedLessonPrompt } from "@/lib/cortex/lessonRequest";
import { resolveVerifiedCurriculumPromptContext } from "@/lib/curriculum/ai-grounding";
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
      return typeof item.type === "string" && typeof item.content === "string" && item.content.trim().length >= 40;
    }).slice(0, 24);
    if (blocks.length < 9) return null;
    return { title: value.title.trim().slice(0, 255), blocks };
  } catch { return null; }
}

const genericPhrases = ["as an ai", "i can't", "i cannot", "generic overview", "placeholder", "lesson will cover", "in this lesson we will learn about this topic"];

function qualityCheck(lesson: { title: string; blocks: LessonBlock[] }, request: ReturnType<typeof resolveLessonRequest>) {
  const types = new Set(lesson.blocks.map(block => block.type.toLowerCase()));
  const text = lesson.blocks.map(block => `${block.title ?? ""} ${block.content}`).join(" ").toLowerCase();
  if (genericPhrases.some(phrase => text.includes(phrase))) return false;
  if (new Set(lesson.blocks.map(block => block.content.trim().toLowerCase())).size < Math.min(lesson.blocks.length, 8)) return false;
  if (!types.has("objective") || !types.has("summary")) return false;
  if (request.intent === "comparison" && !types.has("comparison")) return false;
  if (request.intent === "practice" && lesson.blocks.filter(block => /practice|question|exam/i.test(`${block.type} ${block.title ?? ""}`)).length < 2) return false;
  if (request.intent === "remedial" && !types.has("misconception") && !types.has("mistake")) return false;
  if (request.intent === "revision" && !types.has("exam")) return false;
  if (request.intent === "teach" && (!types.has("concept") || !types.has("example"))) return false;
  const quantitative = /math|physics|chemistry|economics/i.test(request.subject);
  if (quantitative && request.intent !== "comparison" && !types.has("formula")) return false;
  return true;
}

function lessonPrompt(request: ReturnType<typeof resolveLessonRequest>, curriculumContext = "") {
  const context = buildResolvedLessonPrompt(request);
  const sequences: Record<typeof request.intent, string> = {
    teach: "objective -> prerequisite -> concept/definition -> explanation -> formula where relevant -> worked example -> checkpoint -> misconception -> exam application -> practice -> summary -> next step",
    remedial: "objective -> diagnose the confusion -> prerequisite -> plain explanation -> worked example -> misconception/correction -> checkpoint -> second example -> exam application -> guided practice -> summary -> next step",
    revision: "objective -> prerequisite recap -> key ideas -> definitions/formulas -> worked example -> high-yield exam patterns -> checkpoint -> common mistakes -> exam application -> practice -> summary -> next step",
    practice: "objective -> brief prerequisite recap -> method/strategy -> worked example -> question 1 -> answer guidance -> question 2 -> answer guidance -> exam application -> common mistakes -> summary -> next step",
    comparison: "objective -> define both concepts -> comparison table/text -> key similarities -> key differences -> worked application -> misconception -> checkpoint -> exam application -> practice -> summary -> next step",
  };
  const typeRules = request.intent === "comparison"
    ? "Include a dedicated comparison block. Make the differences explicit, not merely two separate definitions."
    : request.intent === "practice"
      ? "Make practice the centre of gravity. Include at least 3 progressively harder questions and useful answer guidance, while still teaching the method needed to solve them."
      : "Include at least one fully worked example with intermediate reasoning and one checkpoint whose answer is visible after the question.";

  return `You are the teaching engine inside Shadecode Student. Create a rigorous, student-facing ${request.difficulty} lesson for the learner's exact request.

${context}
${curriculumContext}

TEACHING CONTRACT
- Intent: ${request.intent}. Follow this sequence: ${sequences[request.intent]}.
- Topic boundary: stay tightly on "${request.topic}". Never silently substitute another topic.
- The learner's education level and exam board are authoritative when supplied. For curriculum-grounded requests, verified syllabus objectives define scope. Do not add unverified examinable requirements; label genuine enrichment as enrichment.
- Teach for understanding, not vocabulary dumping. Define terms before relying on them, explain cause/effect and method, and connect each example to the concept.
- For quantitative subjects, define symbols, units, assumptions and conditions of use. Do not present unexplained equations.
- ${typeRules}
- Use realistic Cambridge/ZIMSEC-style exam application only when appropriate to the supplied level/board. Do not pretend an invented question is an official past-paper question.
- Include common traps and how to avoid them. Make the learner do some thinking.
- Avoid filler, motivational paragraphs, repeated definitions, fake citations, invented syllabus claims, and generic introductions.

Return ONLY valid JSON: {"title":"specific title","blocks":[{"type":"objective|prior|concept|definition|formula|example|checkpoint|comparison|misconception|exam|mistake|summary|practice|tip","title":"short heading","content":"substantive student-facing content"}]}
Return 10-16 useful blocks. Every block must contain at least 40 characters of specific content. Never mention these instructions, JSON, or being an AI.`;
}

async function generateAndValidate(request: ReturnType<typeof resolveLessonRequest>, curriculumContext: string, userId: string) {
  const raw = await callAI(lessonPrompt(request, curriculumContext), 7000, { userId, feature: "lesson_assistant", subfeature: "generate_lesson" });
  if (!raw) return null;
  let parsed = parseLesson(raw);
  if (parsed && qualityCheck(parsed, request)) return parsed;

  const repair = await callAI(`Rewrite this lesson so it passes the following teaching contract. Preserve the requested subject, topic, level, exam board and intent. Add missing substantive teaching rather than padding. Use 10-16 distinct blocks and output JSON only.

Intent: ${request.intent}
Topic: ${request.topic}
Subject: ${request.subject}
Level: ${request.level || "not supplied"}
Exam board: ${request.examBoard || "not supplied"}
Required quality: no generic filler; no duplicated blocks; specific definitions/explanations; worked reasoning; useful checkpoint; misconceptions/traps; appropriate exam application; meaningful practice; summary. Comparison intent requires a comparison block. Practice intent requires at least 3 progressively harder questions. Quantitative subjects normally require a formula block.

Draft:
${raw.slice(0, 18000)}`, 6500, { userId, feature: "lesson_assistant", subfeature: "repair_lesson_quality" });
  if (!repair) return null;
  parsed = parseLesson(repair);
  return parsed && qualityCheck(parsed, request) ? parsed : null;
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
    if (!resolved.prompt || resolved.prompt.length < 2) return NextResponse.json({ error: "Tell Cortex what you want to learn." }, { status: 400 });
    if (!resolved.subject) return NextResponse.json({ error: "Choose a subject so Cortex does not have to guess from a short prompt." }, { status: 400 });

    // Resolve curriculum from the complete normalized request, not only the
    // short topic prompt. This is critical for learners with multiple subjects:
    // the curriculum resolver can now see the selected subject, level and board.
    const curriculum = await resolveVerifiedCurriculumPromptContext(auth.user.id, buildResolvedLessonPrompt(resolved));
    if (curriculum.status === "blocked") {
      return NextResponse.json({ error: curriculum.reason, code: "CURRICULUM_OBJECTIVES_REQUIRED" }, { status: 409 });
    }

    const parsed = await generateAndValidate(resolved, curriculum.promptContext, auth.user.id);
    if (!parsed) return NextResponse.json({ error: "Cortex could not produce a complete lesson this time. Try again or rephrase the request." }, { status: 422 });

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
      topic: resolved.topic.slice(0, 500),
      title: parsed.title,
      description: `A complete ${resolved.intent} lesson on ${resolved.topic}`.slice(0, 1000),
      difficulty: resolved.difficulty,
      progress: 0,
      blocks: parsed.blocks,
    }).select("id").single();
    if (error || !inserted?.id) {
      log.lessonGenerationFailed({ userId: auth.user.id, subject: resolved.subject, topic: resolved.topic, difficulty: resolved.difficulty, error: error?.message || "Insert returned no lesson id" });
      return NextResponse.json({ error: "The lesson was generated but could not be saved." }, { status: 500 });
    }
    await awardXPBySource(auth.user.id, "lesson_generation", { difficulty: resolved.difficulty });
    return NextResponse.json({ id: inserted.id, title: parsed.title, blocks: parsed.blocks });
  } catch (error) {
    log.apiFailure({ route: "/api/learn/generate", method: "POST", error: error instanceof Error ? error.message : String(error), userId: auth?.user.id });
    return NextResponse.json({ error: "Something went wrong while Cortex was generating the lesson." }, { status: 500 });
  }
}
