import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { callAI } from "@/lib/ai";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { awardXPBySource } from "@/lib/xp/manager";
import { resolveLessonRequest, buildResolvedLessonPrompt } from "@/lib/cortex/lessonRequest";
import { lessonQualityFailures } from "@/lib/cortex/lessonQuality";
import { buildDeterministicLessonFallback } from "@/lib/cortex/lessonFallback";
import { resolveVerifiedCurriculumPromptContext } from "@/lib/curriculum/ai-grounding";
import { log } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

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
    }).slice(0, 18);
    return blocks.length >= 10 ? { title: value.title.trim().slice(0, 255), blocks } : null;
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
  const context = buildResolvedLessonPrompt(request);
  const sequences: Record<typeof request.intent, string> = {
    teach: "objective → prerequisite → concept → explanation → formula/method → worked example → checkpoint → misconception → application → exam transfer → progressive practice → summary",
    remedial: "objective → diagnose confusion → prerequisite → explanation → worked example → misconception/correction → checkpoint → second example → application → exam transfer → practice → summary",
    revision: "objective → prerequisite recap → key ideas → definitions/formulas → worked example → high-yield patterns → checkpoint → mistakes → application → exam transfer → practice → summary",
    practice: "objective → method → worked example → question 1 → question 2 → question 3 → application → exam transfer → traps → summary",
    comparison: "objective → define both → comparison → similarities → differences → worked application → misconception → checkpoint → application → exam transfer → practice → summary",
  };
  const mathGuidance = /math|mathematics|maths/i.test(request.subject) ? `\nMATH GUIDANCE\nFor trigonometric identities, teach identities as transformations. Cover sin²θ + cos²θ = 1, 1 + tan²θ = sec²θ, 1 + cot²θ = csc²θ, reciprocal identities and quotient identities. Include a proof by transforming one side only and a simplification where the learner chooses the identity. Stay centered on identities, not solving trigonometric equations.` : "";
  return `You are the senior teaching engine inside Shadecode Student. Produce a rigorous, student-facing learning session, not an article or generic AI response. The learner must finish able to perform a useful skill.\n\n${context}\n${curriculumContext}\n${mathGuidance}\n\nTEACHING CONTRACT\n- Intent: ${request.intent}. Sequence: ${sequences[request.intent]}.\n- Topic boundary: ${request.topic}. Do not silently change the topic.\n- Verified curriculum objectives are the scope gate when supplied. Teach toward them rather than merely naming them.\n- Make the first objective observable and assessable.\n- Teach WHY before WHAT. Define technical terms at first use.\n- Worked examples must show reasoning and intermediate steps.\n- Checkpoints must require thought and must not reveal their answer.\n- Include misconceptions with corrections, a concrete application task, exam transfer, progressive practice and a mastery summary.\n- Never invent official past-paper claims, citations or syllabus requirements.\n- No filler, motivational fluff or AI language.\n- PRESENTATION: Never write a wall of prose. Use short lines separated by newlines. Put each distinct idea, definition, formula, step, question, warning and takeaway on its own line. Use '- ' for lists and '1. ', '2. ' for procedures or ordered reasoning. Worked examples must use 'Given:', 'Method:', 'Step 1:', 'Step 2:' and 'Answer:' on separate lines. Checkpoints must use 'Question:' and 'Think:' or 'Answer:' on separate lines. Exam transfer must use 'Question:', 'Approach:' and 'Examiner looks for:' on separate lines. Keep individual lines concise, normally one sentence or less. Do not use markdown tables.\n\nReturn 10-16 blocks and use these types where possible: objective, prior, concept, definition, formula, example, checkpoint, comparison, misconception, exam, application, mistake, summary, practice, tip. Every block must have at least 30 characters. Practice must contain at least 3 progressively harder questions when intent is practice.\n\nRETURN ONLY JSON: {"title":"specific outcome-focused title","blocks":[{"type":"objective|prior|concept|definition|formula|example|checkpoint|comparison|misconception|exam|application|mistake|summary|practice|tip","title":"short heading","content":"substantive student-facing content"}]}`;
}

async function generateAndValidate(request: ReturnType<typeof resolveLessonRequest>, curriculumContext: string, userId: string) {
  const fallback = () => buildDeterministicLessonFallback(request.subject, request.topic);
  let raw: string | null = null;
  try {
    raw = await callAI(lessonPrompt(request, curriculumContext), 4200, { userId, feature: "lesson_assistant", subfeature: "generate_lesson", maxChainMs: 45000, perProviderMaxMs: 13000 });
  } catch (error) {
    console.warn("[LEARN] primary generation failed", error instanceof Error ? error.message : String(error));
  }

  if (!raw) {
    const local = fallback();
    if (local && qualityCheck(local, request).length === 0) {
      console.warn("[LEARN] using deterministic resilience lesson after provider failure", { subject: request.subject, topic: request.topic });
      return local;
    }
    return null;
  }

  let parsed = parseLesson(raw);
  const initialFailures = parsed ? qualityCheck(parsed, request) : ["invalid-json-or-lesson-shape"];
  if (parsed && initialFailures.length === 0) return parsed;

  try {
    const repair = await callAI(`Repair this failed lesson. Return ONLY valid JSON with 10-16 substantive blocks. Preserve the exact topic, subject, level, board and intent. Fix these checks: ${initialFailures.join(", ")}. The repaired lesson MUST be easy to scan: no wall-of-text paragraphs, no long prose blocks. Use newline-separated learning units. Put each objective, definition, formula, idea, warning, takeaway and question on its own line. Use '- ' for bullets. Use numbered lines for procedures. Worked examples MUST use separate Given:, Method:, Step 1:, Step 2:, Answer: lines. Checkpoints MUST use separate Question: and Think: or Answer: lines. Exam transfer MUST use separate Question:, Approach:, Examiner looks for: lines. Include objective, concept, worked example, checkpoint without its answer when appropriate, misconception, application, exam transfer, progressive practice and summary. For mathematics Trigonometric identities, include the Pythagorean, reciprocal and quotient identities plus a proof by transforming one side.\n\nTopic: ${request.topic}\nSubject: ${request.subject}\nIntent: ${request.intent}\n\nDRAFT:\n${raw.slice(0, 14000)}`, 4200, { userId, feature: "lesson_assistant", subfeature: "repair_lesson_quality", maxChainMs: 28000, perProviderMaxMs: 10000 });
    if (repair) {
      parsed = parseLesson(repair);
      if (parsed && qualityCheck(parsed, request).length === 0) return parsed;
    }
  } catch (error) {
    console.warn("[LEARN] repair failed", error instanceof Error ? error.message : String(error));
  }

  const local = fallback();
  if (local && qualityCheck(local, request).length === 0) {
    console.warn("[LEARN] using deterministic resilience lesson after quality failure", { subject: request.subject, topic: request.topic });
    return local;
  }
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

    const curriculum = await resolveVerifiedCurriculumPromptContext(auth.user.id, buildResolvedLessonPrompt(resolved));
    if (curriculum.status === "blocked") return NextResponse.json({ error: curriculum.reason, code: "CURRICULUM_OBJECTIVES_REQUIRED" }, { status: 409 });

    const parsed = await generateAndValidate(resolved, curriculum.promptContext, auth.user.id);
    if (!parsed) return NextResponse.json({ error: "Cortex could not produce a lesson that met the teaching standard. The topic itself is valid, so try again while Cortex retries the lesson construction." }, { status: 422 });

    const { data: existing } = await auth.supabase.from("subjects").select("id").eq("user_id", auth.user.id).eq("name", resolved.subject).maybeSingle();
    let subjectId = existing?.id ?? null;
    if (!subjectId) {
      const { data: created } = await auth.supabase.from("subjects").insert({ user_id: auth.user.id, name: resolved.subject }).select("id").single();
      subjectId = created?.id ?? null;
    }
    if (!subjectId) return NextResponse.json({ error: "The lesson was generated but its subject could not be saved." }, { status: 500 });

    const { data: inserted, error } = await auth.supabase.from("learn_lessons").insert({ user_id: auth.user.id, subject_id: subjectId, topic: resolved.topic.slice(0, 500), title: parsed.title, description: `A complete ${resolved.intent} lesson on ${resolved.topic}`.slice(0, 1000), difficulty: resolved.difficulty, progress: 0, blocks: parsed.blocks }).select("id").single();
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
