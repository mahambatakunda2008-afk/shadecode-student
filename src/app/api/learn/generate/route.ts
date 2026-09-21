import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { callAI } from "@/lib/ai";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { awardXPBySource } from "@/lib/xp/manager";
import { resolveLessonRequest, buildResolvedLessonPrompt } from "@/lib/cortex/lessonRequest";
import { lessonQualityFailures } from "@/lib/cortex/lessonQuality";
import { buildDeepLessonPrompt, buildLessonRepairPrompt } from "@/lib/learn/contentQuality";
import { isBroadTopic } from "@/lib/learn/curriculumPlanner";
import { buildDeterministicLessonFallback } from "@/lib/cortex/lessonFallback";
import { resolveVerifiedCurriculumPromptContext } from "@/lib/curriculum/ai-grounding";
import { log } from "@/lib/observability";
import { normalizeLessonBlocks } from "@/lib/learn/mathNotation";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type LessonBlock = { type: string; title?: string; content: string; formula?: string; example?: { question: string; answer: string }; options?: string[]; answer?: string };
type AuthContext = { supabase: SupabaseClient; user: User };

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
      return typeof item.type === "string" && typeof item.content === "string" && item.content.trim().length >= 30;
    }).slice(0, 24);
    return blocks.length >= 8 ? { title: value.title.trim().slice(0, 255), blocks: normalizeLessonBlocks(blocks) } : null;
  } catch { return null; }
}

function qualityCheck(lesson: { title: string; blocks: LessonBlock[] }, request: ReturnType<typeof resolveLessonRequest>) {
  const result = lessonQualityFailures(lesson, request);
  if (result.failures.length) {
    console.warn("[LEARN] quality gate rejected lesson", { subject: request.subject, topic: request.topic, intent: request.intent, failures: result.failures, types: result.types, blockCount: lesson.blocks.length });
    return result.failures;
  }
  return [] as string[];
}

function lessonPrompt(request: ReturnType<typeof resolveLessonRequest>, curriculumContext = "") {
  const broad = request.broadTopic || isBroadTopic(request.topic);
  const deep = request.depth === "deep" || broad;

  if (deep) {
    return `You are Cortex, the senior teaching engine inside Shadecode Student.

The learner is asking for a serious teaching session. A broad request is not a request for a definition or a handful of revision cards. It is a request to build a connected mental model of the territory.

${buildDeepLessonPrompt(request.subject || "General", request.topic, request.difficulty, curriculumContext)}

LEARNER REQUEST CONTEXT
${buildResolvedLessonPrompt(request)}

VERIFIED CURRICULUM CONTEXT
${curriculumContext || "No verified curriculum context was returned. Do not make board-specific syllabus claims."}

IMPORTANT SCOPE RULE
The exact learner request remains the authority for intent. For a broad topic, use the curriculum map as the spine, but do not pretend that a few blocks equal mastery of an entire field. Cover the major branches with substantive teaching and finish with clear continuation paths.

PRESENTATION
This is a learning interface, not an essay. Keep blocks purposeful and scannable. Use short lines, explicit reasoning, worked steps, checkpoints, misconceptions, synthesis and curiosity. Do not pad the lesson merely to hit a number.

MATH NOTATION
Any mathematical expression must use single-dollar LaTeX delimiters. Never use caret powers or ASCII slash fractions in student-facing content.

OUTPUT
Return ONLY JSON:
{"title":"specific title that names the actual topic and learning outcome","blocks":[{"type":"objective|map|prior|concept|definition|structure|mechanism|formula|example|comparison|checkpoint|misconception|application|exam|mistake|synthesis|curiosity|summary|practice|next","title":"short content-specific heading","content":"substantive student-facing content"}]}`;
  }

  const context = buildResolvedLessonPrompt(request);
  return `You are Cortex, the senior teaching engine inside Shadecode Student. Generate a student-facing learning session from the learner request and verified curriculum context below. Optimize for understanding and use, not block count.

${context}

VERIFIED CURRICULUM CONTEXT:
${curriculumContext || "No verified curriculum context was returned. Do not make board-specific syllabus claims."}

CORE RULES
1. Follow the learner's exact intent and topic.
2. For focused topics, teach the requested topic deeply enough to explain, apply, check and practise it.
3. Use verified curriculum objectives as a scope gate when supplied.
4. Do not invent syllabus requirements, past-paper provenance, mark allocations or examiner claims.
5. Every worked example must teach the reasoning, not only the final answer.
6. Every checkpoint must make the learner think and must not reveal its answer in the same block.
7. Do not add unrelated sections just to reach a block count.

PRESENTATION
Use 8-14 purposeful blocks for standard requests. Use short scannable lines. Worked examples use Given:, Method:, Step 1:, Step 2:, Answer:. Checkpoints use Question: and Think:. Avoid wall-of-text paragraphs and artificial template headings.

MATH NOTATION
Any mathematical expression must use single-dollar LaTeX delimiters. Never use caret powers or ASCII slash fractions in student-facing content.

OUTPUT
Return ONLY JSON:
{"title":"specific title that names the actual topic and learning outcome","blocks":[{"type":"objective|prior|concept|definition|formula|example|checkpoint|comparison|misconception|exam|application|mistake|practice|summary|tip","title":"short content-specific heading","content":"substantive student-facing content"}]}`;
}

async function generateAndValidate(request: ReturnType<typeof resolveLessonRequest>, curriculumContext: string, userId: string) {
  const fallback = () => buildDeterministicLessonFallback(request.subject, request.topic);
  let raw: string | null = null;
  try {
    raw = await callAI(lessonPrompt(request, curriculumContext), 4200, { userId, feature: "lesson_assistant", subfeature: "generate_lesson", maxChainMs: 24000, perProviderMaxMs: 12000, curriculumContext });
  } catch (error) {
    console.warn("[LEARN] primary generation failed", error instanceof Error ? error.message : String(error));
  }

  if (!raw) {
    const local = fallback();
    if (local && qualityCheck(local, request).length === 0) return local;
    return null;
  }

  let parsed = parseLesson(raw);
  const initialFailures = parsed ? qualityCheck(parsed, request) : ["invalid-json-or-lesson-shape"];
  if (parsed && initialFailures.length === 0) return parsed;

  try {
    const repair = await callAI(buildLessonRepairPrompt(request.subject || "General", request.topic, raw, curriculumContext, request.difficulty, initialFailures), 4200, { userId, feature: "lesson_assistant", subfeature: "repair_lesson_quality", maxChainMs: 20000, perProviderMaxMs: 9000, curriculumContext });
    if (repair) {
      parsed = parseLesson(repair);
      if (parsed && qualityCheck(parsed, request).length === 0) return parsed;
    }
  } catch (error) {
    console.warn("[LEARN] repair failed", error instanceof Error ? error.message : String(error));
  }

  const local = fallback();
  if (local && qualityCheck(local, request).length === 0) return local;
  return null;
}

export async function POST(req: Request) {
  let auth: AuthContext | null = null;
  try {
    const limited = await applyRateLimit(req, aiEndpointLimiter);
    if (limited) return limited;
    auth = await authenticate(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const resolved = resolveLessonRequest({ prompt: body.prompt ?? body.topic ?? "", subject: body.subject, topic: body.topic, level: body.level, difficulty: body.difficulty, goal: body.goal, examBoard: body.examBoard });
    if (!resolved.prompt || resolved.prompt.length < 2) return NextResponse.json({ error: "Tell Cortex what you want to learn." }, { status: 400 });
    if (!resolved.subject) return NextResponse.json({ error: "Choose a subject so Cortex does not have to guess from a short prompt." }, { status: 400 });

    const subjectAccess = await resolveLearnerSubject(auth.supabase, auth.user.id, resolved.subject, body.subjectId);
    if (!subjectAccess.ok) return NextResponse.json({ error: subjectAccess.error }, { status: subjectAccess.status });
    const authorizedSubject = subjectAccess.subject;

    const curriculumLookupPrompt = `${buildResolvedLessonPrompt({ ...resolved, subject: authorizedSubject })}\nmaster this request: "${resolved.topic}"`;
    const curriculum = await resolveVerifiedCurriculumPromptContext(auth.user.id, curriculumLookupPrompt);
    if (curriculum.status === "blocked") return NextResponse.json({ error: curriculum.reason, code: "CURRICULUM_OBJECTIVES_REQUIRED" }, { status: 409 });

    const effectiveTopic = curriculum.resolvedTopic?.trim() || resolved.topic;
    const generationRequest = { ...resolveLessonRequest({ prompt: resolved.prompt, subject: authorizedSubject, topic: effectiveTopic, level: resolved.level, difficulty: resolved.difficulty, goal: resolved.goal, examBoard: resolved.examBoard }), broadTopic: resolved.broadTopic || isBroadTopic(effectiveTopic) };
    const parsed = await generateAndValidate(generationRequest, curriculum.promptContext, auth.user.id);
    if (!parsed) return NextResponse.json({ error: "Cortex could not produce a lesson that met the teaching standard. The topic itself is valid, so try again while Cortex retries the lesson construction." }, { status: 422 });

    const subjectId = subjectAccess.subjectId;
    const { data: inserted, error } = await auth.supabase.from("learn_lessons").insert({ user_id: auth.user.id, subject_id: subjectId, topic: generationRequest.topic.slice(0, 500), title: parsed.title, description: `A complete ${generationRequest.intent} lesson on ${generationRequest.topic}`.slice(0, 1000), difficulty: generationRequest.difficulty, progress: 0, blocks: parsed.blocks }).select("id").single();
    if (error || !inserted?.id) {
      log.lessonGenerationFailed({ userId: auth.user.id, subject: generationRequest.subject, topic: generationRequest.topic, difficulty: generationRequest.difficulty, error: error?.message || "Insert returned no lesson id" });
      return NextResponse.json({ error: "The lesson was generated but could not be saved." }, { status: 500 });
    }

    await awardXPBySource(auth.user.id, "lesson_generation", { difficulty: generationRequest.difficulty });
    return NextResponse.json({ id: inserted.id, title: parsed.title, blocks: parsed.blocks, subject: authorizedSubject, subjectId });
  } catch (error) {
    log.apiFailure({ route: "/api/learn/generate", method: "POST", error: error instanceof Error ? error.message : String(error), userId: auth?.user.id });
    return NextResponse.json({ error: "Something went wrong while Cortex was generating the lesson." }, { status: 500 });
  }
}