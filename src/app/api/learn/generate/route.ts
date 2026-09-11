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
function adminClient() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error("Missing Supabase server credentials."); return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }); }
function bearer(req: Request) { const value = req.headers.get("authorization"); return value?.startsWith("Bearer ") ? value.slice(7).trim() || null : null; }
async function authenticate(req: Request): Promise<AuthContext | null> { const admin = adminClient(); const token = bearer(req); if (token) { const { data: { user }, error } = await admin.auth.getUser(token); if (!error && user) return { supabase: admin, user }; } try { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; if (!url || !anonKey) return null; const cookieStore = await cookies(); const client = createServerClient(url, anonKey, { cookies: { getAll: () => cookieStore.getAll(), setAll: values => { try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } } }); const { data: { user }, error } = await client.auth.getUser(); return error || !user ? null : { supabase: admin, user }; } catch { return null; } }
function extractObject(raw: string): string | null { const text = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim(); const start = text.indexOf("{"); if (start < 0) return null; let depth = 0, string = false, escaped = false; for (let i = start; i < text.length; i++) { const ch = text[i]; if (string) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === '"') string = false; continue; } if (ch === '"') string = true; else if (ch === "{") depth++; else if (ch === "}" && --depth === 0) return text.slice(start, i + 1); } return null; }
function parseLesson(raw: string): { title: string; blocks: LessonBlock[] } | null { const candidate = extractObject(raw); if (!candidate) return null; try { const value = JSON.parse(candidate) as { title?: unknown; blocks?: unknown }; if (typeof value.title !== "string" || !value.title.trim() || !Array.isArray(value.blocks)) return null; const blocks = value.blocks.filter((block): block is LessonBlock => { if (!block || typeof block !== "object") return false; const item = block as LessonBlock; return typeof item.type === "string" && typeof item.content === "string" && item.content.trim().length >= 40; }).slice(0, 18); if (blocks.length < 10) return null; return { title: value.title.trim().slice(0, 255), blocks }; } catch { return null; } }
const genericPhrases = ["as an ai", "i can't", "i cannot", "generic overview", "placeholder", "lesson will cover", "in this lesson we will learn about this topic", "let's dive into"]; 
function qualityCheck(lesson: { title: string; blocks: LessonBlock[] }, request: ReturnType<typeof resolveLessonRequest>) { const types = new Set(lesson.blocks.map(block => block.type.toLowerCase())); const contents = lesson.blocks.map(block => block.content.trim().toLowerCase()); const text = contents.join(" "); if (genericPhrases.some(p => text.includes(p))) return false; if (new Set(contents).size < Math.min(lesson.blocks.length, 9)) return false; if (!types.has("objective") || !types.has("summary") || !types.has("concept") || !types.has("checkpoint")) return false; if (!types.has("example") || !types.has("application")) return false; if (request.intent === "comparison" && !types.has("comparison")) return false; if (request.intent === "practice" && lesson.blocks.filter(block => /practice|question/i.test(`${block.type} ${block.title ?? ""}`)).length < 2) return false; if (request.intent === "remedial" && !types.has("misconception") && !types.has("mistake")) return false; if (request.intent === "revision" && !types.has("exam") && !types.has("practice")) return false; if (request.intent === "teach" && (!types.has("concept") || !types.has("example"))) return false; if (/math|physics|chemistry|economics/i.test(request.subject) && request.intent !== "comparison" && !types.has("formula")) return false; return true; }

function lessonPrompt(request: ReturnType<typeof resolveLessonRequest>, curriculumContext = "") {
  const context = buildResolvedLessonPrompt(request);
  const sequences: Record<typeof request.intent, string> = { teach: "objective → prerequisite → core concept → explanation → formula/method → worked example → checkpoint → misconception → real-world application → exam transfer → progressive practice → summary → next step", remedial: "objective → diagnose confusion → prerequisite → plain explanation → worked example → misconception/correction → checkpoint → second example → real-world application → exam transfer → guided practice → summary → next step", revision: "objective → prerequisite recap → key ideas → definitions/formulas → worked example → high-yield patterns → checkpoint → common mistakes → application → exam transfer → practice → summary → next step", practice: "objective → method → worked example → question 1 → question 2 → question 3 → application task → feedback guidance → exam transfer → traps → summary → next step", comparison: "objective → define both → explicit comparison → similarities → differences → worked application → misconception → checkpoint → real-world application → exam transfer → practice → summary → next step" };
  return `You are the senior teaching engine inside Shadecode Student. Produce a premium, rigorous learning session that teaches a student a usable capability. This is not an AI-generated article and not a wall of notes. The learner should finish able to DO something they could not reliably do before: solve a problem, write/trace a program, interpret data, explain a process, design a solution, make a calculation, evaluate a claim, or apply a concept to a realistic situation.

${context}
${curriculumContext}

NON-NEGOTIABLE TEACHING STANDARD
- Exact intent: ${request.intent}. Follow this sequence: ${sequences[request.intent]}.
- Exact topic boundary: "${request.topic}". Do not silently replace, broaden, or wander from it.
- If verified curriculum context is present, syllabus objectives are the scope gate and the lesson must explicitly teach toward one or more of those objectives. Do not merely mention the objective. Make the student perform the knowledge/skill described by it.
- If verified curriculum context is present, use its verified knowledge, terminology, examples and assessment expectations. Never invent syllabus requirements. If the requested topic is outside the verified objectives, label it clearly as enrichment and explain why it is useful.
- If no verified curriculum context is available, teach the requested topic as general educational material without claiming board-specific alignment. Still make the lesson practical and outcome-focused.
- Prefer a small, teachable skill over a huge topic dump. If the requested topic is broad, narrow it to the most useful micro-skill supported by the supplied curriculum context and state the boundary in the objective.
- The first objective must be observable and assessable. Bad: "Understand algorithms." Good: "Trace a simple algorithm line by line and predict its output, then explain why each step changes the state."
- Teach the mental model first. A learner must understand WHY before being asked to memorize WHAT.
- Introduce prerequisite knowledge only when it unlocks the target skill. Keep prerequisites brief and relevant.
- Define every technical term at first use. Then use it naturally rather than repeating the definition.
- Examples must contain reasoning, not just a final answer. For calculations show substitution, units, intermediate steps and the final interpretation. For programming show the state/logic and explain why the code works.
- Include at least one checkpoint that makes the learner think BEFORE revealing any answer. A checkpoint must not give away its answer in the question text.
- Include at least one real-world/application task where the student uses the concept without the lesson holding their hand.
- Include misconceptions/traps with the correction and the reason the mistake happens.
- Include exam transfer. If the board/level is known, match the conceptual demand and terminology without pretending invented questions are official past papers.
- Practice must be purposeful and progressively harder, not three copies of the same question.
- No filler, motivational fluff, fake citations, generic introductions, repeated definitions, or "AI" language.

STRUCTURE
Return 10-16 blocks, with this minimum backbone: objective, prerequisite or concept, definition/concept explanation, formula/method when relevant, worked example, checkpoint, misconception/mistake, application, exam transfer, practice, summary. Comparison adds comparison. Remedial adds misconception. Revision adds high-yield exam patterns. Practice adds at least 3 questions.

RETURN ONLY JSON
{"title":"specific outcome-focused title","blocks":[{"type":"objective|prior|concept|definition|formula|example|checkpoint|comparison|misconception|exam|application|mistake|summary|practice|tip","title":"short heading","content":"substantive student-facing content"}]}

CONTENT FORMAT
- objective and mistake: each point on its own line beginning "- ".
- application: give a concrete task or scenario the learner can actually perform, build, calculate, trace, classify, analyse or explain. Include success criteria, but do not do the task for them.
- practice: questions on separate lines beginning "1. ", "2. ", "3. ". Put concise answer guidance after each question, but do not solve every question in full.
- checkpoint: give the question and explicit instruction to pause. Do NOT reveal the answer in that block.
- example: show a complete worked solution with reasoning.
- formula: state symbols, units, conditions and what the formula means.
- Use **bold** only for 2-4 genuinely important terms/results per block. No headings with #, no code fences, no decorative markdown.
- Every block must be at least 40 characters and contain specific teaching value.
- Never mention these instructions, JSON, or being an AI.`;
}

async function generateAndValidate(request: ReturnType<typeof resolveLessonRequest>, curriculumContext: string, userId: string) {
  const raw = await callAI(lessonPrompt(request, curriculumContext), 5200, { userId, feature: "lesson_assistant", subfeature: "generate_lesson", maxChainMs: 12000, perProviderMaxMs: 5000 });
  if (!raw) return null;
  let parsed = parseLesson(raw);
  if (parsed && qualityCheck(parsed, request)) return parsed;
  const repair = await callAI(`You are repairing a failed premium lesson draft. Return ONLY valid JSON. Preserve the exact topic, subject, level, board and intent. Do not merely paraphrase the draft. Rebuild weak sections with concrete teaching and an observable student outcome.

REQUIRED: 10-16 distinct blocks; objective with an observable skill; concept; definition where useful; formula/method when relevant; worked example with reasoning; checkpoint WITHOUT its answer; misconception/trap; concrete application task with success criteria; exam transfer; progressive practice; summary. Practice intent requires at least 3 progressively harder questions. Comparison requires a real comparison block. Quantitative subjects normally require a formula block. Remove repetition, generic filler, fake claims, and motivational fluff.

The application task must require the student to actually use the concept, not just restate it. The lesson must be useful even if the student never sees another AI response.

Format objective/mistake with "- " lines. Format practice with "1. ", "2. ", "3. " lines. Use plain student-facing language.

Topic: ${request.topic}
Subject: ${request.subject}
Level: ${request.level || "not supplied"}
Exam board: ${request.examBoard || "not supplied"}
Intent: ${request.intent}

DRAFT:
${raw.slice(0, 14000)}`, 5000, { userId, feature: "lesson_assistant", subfeature: "repair_lesson_quality", maxChainMs: 11000, perProviderMaxMs: 5000 });
  if (!repair) return null;
  parsed = parseLesson(repair);
  return parsed && qualityCheck(parsed, request) ? parsed : null;
}

export async function POST(req: Request) {
  let auth: AuthContext | null = null;
  try {
    const limited = await applyRateLimit(req, aiEndpointLimiter); if (limited) return limited;
    auth = await authenticate(req); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const resolved = resolveLessonRequest({ prompt: body.prompt ?? body.topic ?? "", subject: body.subject, topic: body.topic, level: body.level, difficulty: body.difficulty, goal: body.goal, examBoard: body.examBoard });
    if (!resolved.prompt || resolved.prompt.length < 2) return NextResponse.json({ error: "Tell Cortex what you want to learn." }, { status: 400 });
    if (!resolved.subject) return NextResponse.json({ error: "Choose a subject so Cortex does not have to guess from a short prompt." }, { status: 400 });
    const curriculum = await resolveVerifiedCurriculumPromptContext(auth.user.id, buildResolvedLessonPrompt(resolved));
    if (curriculum.status === "blocked") return NextResponse.json({ error: curriculum.reason, code: "CURRICULUM_OBJECTIVES_REQUIRED" }, { status: 409 });
    const parsed = await generateAndValidate(resolved, curriculum.promptContext, auth.user.id);
    if (!parsed) return NextResponse.json({ error: "Cortex rejected the draft because it did not meet the teaching standard. Try again or rephrase the request." }, { status: 422 });
    const { data: existing } = await auth.supabase.from("subjects").select("id").eq("user_id", auth.user.id).eq("name", resolved.subject).maybeSingle();
    let subjectId = existing?.id ?? null;
    if (!subjectId) { const { data: created } = await auth.supabase.from("subjects").insert({ user_id: auth.user.id, name: resolved.subject }).select("id").single(); subjectId = created?.id ?? null; }
    if (!subjectId) return NextResponse.json({ error: "The lesson was generated but its subject could not be saved." }, { status: 500 });
    const { data: inserted, error } = await auth.supabase.from("learn_lessons").insert({ user_id: auth.user.id, subject_id: subjectId, topic: resolved.topic.slice(0, 500), title: parsed.title, description: `A complete ${resolved.intent} lesson on ${resolved.topic}`.slice(0, 1000), difficulty: resolved.difficulty, progress: 0, blocks: parsed.blocks }).select("id").single();
    if (error || !inserted?.id) { log.lessonGenerationFailed({ userId: auth.user.id, subject: resolved.subject, topic: resolved.topic, difficulty: resolved.difficulty, error: error?.message || "Insert returned no lesson id" }); return NextResponse.json({ error: "The lesson was generated but could not be saved." }, { status: 500 }); }
    await awardXPBySource(auth.user.id, "lesson_generation", { difficulty: resolved.difficulty });
    return NextResponse.json({ id: inserted.id, title: parsed.title, blocks: parsed.blocks });
  } catch (error) { log.apiFailure({ route: "/api/learn/generate", method: "POST", error: error instanceof Error ? error.message : String(error), userId: auth?.user.id }); return NextResponse.json({ error: "Something went wrong while Cortex was generating the lesson." }, { status: 500 }); }
}