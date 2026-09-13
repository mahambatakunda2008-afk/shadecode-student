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
    return blocks.length >= 8 ? { title: value.title.trim().slice(0, 255), blocks } : null;
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
  return `You are Cortex, the senior teaching engine inside Shadecode Student. Generate a student-facing learning session from the learner request and verified curriculum context below. Do not behave like a generic article writer and do not optimize for block count. Optimize for the learner actually understanding and being able to use the requested knowledge.\n\n${context}\n\nVERIFIED CURRICULUM CONTEXT:\n${curriculumContext || "No verified curriculum context was returned. Do not make board-specific syllabus claims."}\n\nCORE GENERATION RULES\n1. Intent comes before template. Follow the learner's requested action exactly: teach, remedial, revision, practice or comparison.\n2. Topic comes before breadth. Stay centered on the requested topic. Related knowledge is allowed only when it is a prerequisite, necessary explanation, direct consequence or direct application.\n3. Do not let a generic goal such as "master ..." override the actual learner command.\n4. If the learner says "teach me [topic]", teach the topic. Do not convert it into a lesson on every technique associated with the topic.\n5. Normalize obvious spelling mistakes internally. For example, a misspelled topic should not become a new invented concept.\n6. Use verified curriculum objectives as a scope gate when supplied. Do not merely copy objectives into the lesson.\n7. Do not invent syllabus requirements, past-paper provenance, mark allocations or examiner claims.\n8. Do not add sections just because a template usually contains them. If a proof, application, exam transfer, formula, prerequisite or misconception is not useful for this topic and intent, leave it out.\n9. Every numerical answer must be attached to a complete question or worked example. Never output unexplained results such as a bare number.\n10. A checkpoint is for the learner to think. Do not reveal its answer inside the checkpoint itself.\n11. A worked example must teach the reasoning, not just show a final answer.\n12. Use terminology appropriate to the learner's level.\n\nINTENT BEHAVIOUR\n- teach: build the mental model, define what is needed, demonstrate the requested skill, check understanding, then give a small amount of practice.\n- remedial: identify the likely gap, rebuild the prerequisite, explain the confusing point simply, correct the misconception, then check understanding.\n- revision: compress the topic into high-yield knowledge and distinctions, then test recall and transfer.\n- practice: keep explanation brief, demonstrate one representative method, then provide progressively harder questions.\n- comparison: define the things being compared, make the meaningful differences explicit, then test the distinction.\n\nPRESENTATION\nThis is a learning interface, not an essay. Use 8-14 purposeful blocks when the topic supports them, fewer when it does not. Never write wall-of-text paragraphs. Keep lines short and scannable. Use one distinct idea per line. Use '- ' for compact lists. Use numbered lines for ordered reasoning. Worked examples use separate lines: Given:, Method:, Step 1:, Step 2:, Answer:. Proofs use one transformation per numbered line. Formulas go on their own lines. Checkpoints use separate Question: and Think: lines. Exam transfer is only included when relevant and uses Question:, Approach:, Examiner looks for:. Avoid artificial headings such as Demanded worked example, Distribution myth, Verification habit, or other internal-template language. Headings should describe the actual learning content.\n\nMATH NOTATION\nAny mathematical expression, however short, must be wrapped in single dollar signs, e.g. $x^{n+1}$ or $\\int x^n\\,dx = \\frac{x^{n+1}}{n+1}+C$. Use real LaTeX commands inside the delimiters (\\frac{}{}, \\int, \\sqrt{}, \\neq, \\leq, \\geq, \\theta, \\pi, ^{} for exponents, _{} for subscripts) rather than plain-text approximations like x^2 or n!=1 outside delimiters -- those render as literal caret and exclamation characters, not as math. Never leave a formula, equation or exponent unwrapped in plain prose.\n\nSTRUCTURE\nStart with an observable learning objective. Then choose only the learning units needed for this request. A normal teach session may contain objective, prerequisite, concept, definition/formula, worked example, checkpoint, misconception or mistake, targeted practice and summary. A practice session should prioritize questions. A comparison should prioritize the comparison. Do not force the same sequence onto every request.\n\nOUTPUT\nReturn ONLY JSON: {"title":"specific title that names the actual topic and learning outcome","blocks":[{"type":"objective|prior|concept|definition|formula|example|checkpoint|comparison|misconception|exam|application|mistake|summary|practice|tip","title":"short content-specific heading","content":"substantive student-facing content"}]}`;
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
    if (local && qualityCheck(local, request).length === 0) return local;
    return null;
  }

  let parsed = parseLesson(raw);
  const initialFailures = parsed ? qualityCheck(parsed, request) : ["invalid-json-or-lesson-shape"];
  if (parsed && initialFailures.length === 0) return parsed;

  try {
    const repair = await callAI(`You are repairing a Cortex lesson that failed its quality gate. Rebuild it around the learner's actual intent and exact topic. Do not add unrelated material to make it longer. Fix these failures: ${initialFailures.join(", ")}. Return ONLY JSON with 8-14 purposeful blocks. Preserve subject, level, board, intent and topic. Do not invent curriculum claims.\n\n${buildResolvedLessonPrompt(request)}\n\nPresentation: short scannable lines, no wall-of-text. Use Given:/Method:/Step 1:/Answer: for worked examples. Use Question:/Think: for checkpoints without immediately giving the answer. Wrap every math expression in single dollar signs using real LaTeX (e.g. $\\frac{x^{n+1}}{n+1}$, $\\neq$) -- never leave a caret, underscore or exponent unwrapped in plain text. Do not fabricate unexplained numerical results. Do not use internal-template headings.\n\nDRAFT:\n${raw.slice(0, 14000)}`, 4200, { userId, feature: "lesson_assistant", subfeature: "repair_lesson_quality", maxChainMs: 28000, perProviderMaxMs: 10000 });
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
