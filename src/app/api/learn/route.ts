import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { log } from "@/lib/observability";
import type { LearnDetailResponse, LearnLesson, LearnListResponse, LearnSubject, LessonDifficulty } from "@/app/(app)/learn/types";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { learnCoursePreviewSchema, learnGenerateLessonSchema, validateRequestBody } from "@/lib/validation/schemas";
import { callAI } from "@/lib/ai";
import { awardXPBySource } from "@/lib/xp/manager";

export const dynamic = "force-dynamic";
export const maxDuration = 90;
interface SubjectRow { id: string; name: string; }
interface ProfileRow { xp: number | null; streak: number | null; level: number | null; }
interface LessonBlock { type: string; title?: string; content: string; formula?: string; example?: { question: string; answer: string }; options?: string[]; answer?: string; }
interface LearnLessonRow { id: string; subject_id: string; topic: string | null; title: string; description: string | null; difficulty: string | null; progress: number | null; updated_at: string | null; blocks: LessonBlock[] | null; }
interface AuthContext { supabase: SupabaseClient; user: User; }
function getSupabaseAdmin() { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) throw new Error("Missing Supabase server credentials."); return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }); }
function getBearerToken(req: Request): string | null { const h = req.headers.get("authorization"); return h?.startsWith("Bearer ") ? h.slice(7).trim() || null : null; }

async function authenticateRequest(req: Request): Promise<AuthContext | null> {
  const admin = getSupabaseAdmin();
  const token = getBearerToken(req);

  // Prefer the explicit bearer token used by the client. If it is missing or
  // stale, fall back to the browser's Supabase cookie session so a refreshable
  // session does not become a mysterious 401 in Learn.
  if (token) {
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (!error && user) return { supabase: admin, user };
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return null;
    const cookieStore = await cookies();
    const sessionClient = createServerClient(url, anonKey, {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components/route contexts can make cookies immutable.
            // Reading the session is still sufficient for authentication.
          }
        },
      },
    });
    const { data: { user }, error } = await sessionClient.auth.getUser();
    return error || !user ? null : { supabase: admin, user };
  } catch {
    return null;
  }
}

function normalizeDifficulty(v: string | null): LessonDifficulty { return v === "medium" || v === "hard" ? v : "easy"; }
function clampProgress(v: number | null): number { return typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 0; }
function toLearnLesson(row: LearnLessonRow, subjectById: Map<string, string>) { const progress = clampProgress(row.progress); return { id: row.id, subjectId: row.subject_id, topic: row.topic ?? undefined, subject: subjectById.get(row.subject_id) ?? "Unknown subject", title: row.title, description: row.description ?? "", difficulty: normalizeDifficulty(row.difficulty), progress, completed: progress >= 100, updated_at: row.updated_at ?? undefined, blocks: row.blocks ?? undefined }; }
function buildSubjectTabs(subjects: SubjectRow[], lessons: LearnLessonRow[]): LearnSubject[] { const counts = lessons.reduce<Record<string, number>>((acc, l) => { acc[l.subject_id] = (acc[l.subject_id] ?? 0) + 1; return acc; }, {}); return subjects.map(s => ({ id: s.id, name: s.name, lessonCount: counts[s.id] ?? 0 })); }

function extractJSONObject(raw: string): string | null {
  const text = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const start = text.indexOf("{"); if (start < 0) return null;
  let depth = 0; let inString = false; let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === '"') inString = false; continue; }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}
function cleanJsonText(text: string) { return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/\\(?!["\\/bfnrtu])/g, "\\\\"); }
function validateLesson(value: unknown): { title: string; blocks: LessonBlock[] } | null {
  if (!value || typeof value !== "object") return null;
  const p = value as { title?: unknown; blocks?: unknown };
  if (typeof p.title !== "string" || !p.title.trim() || !Array.isArray(p.blocks)) return null;
  const blocks = p.blocks.filter((b): b is LessonBlock => !!b && typeof b === "object" && typeof (b as LessonBlock).type === "string" && typeof (b as LessonBlock).content === "string" && (b as LessonBlock).content.trim().length >= 12).slice(0, 24);
  const required = new Set(["objective", "concept", "example", "checkpoint", "exam", "mistake", "summary"]);
  const types = new Set(blocks.map(b => b.type));
  if (blocks.length < 9 || ![...required].every(type => types.has(type))) return null;
  return { title: p.title.trim().slice(0, 255), blocks };
}
function safeParseJSON(raw: string): { title: string; blocks: LessonBlock[] } | null {
  const candidates = [extractJSONObject(raw), extractJSONObject(cleanJsonText(raw)), extractJSONObject(raw.replace(/\\/g, ""))].filter((v): v is string => Boolean(v));
  for (const candidate of candidates) { try { const parsed = validateLesson(JSON.parse(candidate)); if (parsed) return parsed; } catch {} }
  return null;
}

function buildLessonPrompt(subject: string, topic: string, difficulty: string): string {
  const guide = ({ easy: "Use guided first principles, small steps and frequent checks.", medium: "Use rigorous standard A-Level language, precise reasoning and exam application.", hard: "Use demanding exam-ready reasoning, subtle distinctions, traps and higher-order application." } as Record<string,string>)[difficulty] ?? "Use rigorous standard A-Level language, precise reasoning and exam application.";
  return `You are a brilliant ${subject} teacher and curriculum designer. Build a COMPLETE, genuinely useful ${difficulty.toUpperCase()} lesson for a student who wants to master this request: "${topic}".

Teaching mode: ${guide}

This is not a short AI summary. It must feel like a compact textbook chapter plus a mini tutorial. Assume the student may know very little, but do not dumb down the subject. Define unfamiliar terms, connect ideas causally, show the reasoning behind formulas, and make every example teach something.

Return ONLY one valid JSON object. No markdown fences. Use exactly this shape:
{"title":"specific lesson title","blocks":[{"type":"objective|prior|concept|definition|formula|example|checkpoint|misconception|exam|mistake|summary|practice|tip","title":"optional short heading","content":"substantive student-facing content"}]}

CONTENT REQUIREMENTS:
1. Produce 12-16 blocks, in a deliberate teaching sequence.
2. objective: 3-5 concrete outcomes the student should be able to do.
3. prior: briefly activate prerequisite knowledge and state what is assumed.
4. concept: explain the central idea from first principles, including WHY it works.
5. definition: give precise subject terminology and distinguish commonly confused terms.
6. formula: include every essential relationship, define every symbol, state units/conditions, and explain when it applies. For mathematics/physics use plain readable notation, not LaTeX commands.
7. example: give a fully worked numerical or concrete example. Show the reasoning and intermediate steps, not only the final answer.
8. checkpoint: give a short question that tests understanding. Include the answer/reasoning in the content so the learner can self-check.
9. misconception: expose at least one realistic wrong idea and explain why it is wrong.
10. exam: give a Cambridge/ZIMSEC-style application or structured question with enough context to require transfer, then explain the method and mark-worthy reasoning.
11. mistake: list common errors, traps, unit/significant-figure issues or command-word mistakes relevant to this topic.
12. summary: compress the mental model into memorable takeaways, not a generic conclusion.
13. practice: give 2-3 progressively harder questions and include concise answer guidance so the lesson is usable offline without another AI call.
14. tip: give a high-value exam/study tactic specific to this topic.
15. At least FOUR blocks must contain multiple sentences. At least TWO blocks must contain explicit step-by-step reasoning.
16. Never pad with phrases like "understanding this is important". Every block must add knowledge, reasoning, application or a useful check.
17. Stay faithful to ${subject} and the requested topic. Do not invent syllabus claims. If a convention varies, state the convention clearly.
18. Do not mention that you are an AI, the prompt, JSON, or these instructions.`;
}

export async function GET(req: Request) { let auth: any = null; try { auth = await authenticateRequest(req); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const url = new URL(req.url); const subjectId = url.searchParams.get("subjectId") ?? "all"; const lessonId = url.searchParams.get("lessonId"); const { supabase, user } = auth; const [{ data: profileData }, { data: subjectsData, error: subjectsError }] = await Promise.all([supabase.from("profiles").select("xp, streak, level").eq("id", user.id).maybeSingle(), supabase.from("subjects").select("id, name").eq("user_id", user.id).order("name", { ascending: true })]); if (subjectsError) console.error("Subjects query error:", subjectsError); const subjects = (subjectsData ?? []) as SubjectRow[]; const subjectById = new Map(subjects.map(s => [s.id, s.name])); const profile = profileData as ProfileRow | null; const level = profile?.level ?? 1; const summary = { currentXP: profile?.xp ?? 0, currentStreak: profile?.streak ?? 0, level, xpGoal: Math.max(100, level * 100) }; if (lessonId) { const { data: lessonData, error: lessonError } = await supabase.from("learn_lessons").select("id, subject_id, topic, title, description, difficulty, progress, updated_at, blocks").eq("user_id", user.id).eq("id", lessonId).maybeSingle(); if (lessonError) return NextResponse.json({ error: "Unable to load lesson." }, { status: 500 }); if (!lessonData) return NextResponse.json({ error: "Lesson not found." }, { status: 404 }); const response: LearnDetailResponse = { lesson: toLearnLesson(lessonData as LearnLessonRow, subjectById) }; return NextResponse.json(response); } const { data: allLessonData, error: allLessonsError } = await supabase.from("learn_lessons").select("id, subject_id, topic, title, description, difficulty, progress, updated_at, blocks").eq("user_id", user.id).order("updated_at", { ascending: false }); if (allLessonsError) return NextResponse.json({ subjects: buildSubjectTabs(subjects, []), lessons: [], summary }); const allLessons = (allLessonData ?? []) as LearnLessonRow[]; const filtered = subjectId === "all" ? allLessons : allLessons.filter(l => l.subject_id === subjectId); const response: LearnListResponse = { subjects: buildSubjectTabs(subjects, allLessons), lessons: filtered.map(l => toLearnLesson(l, subjectById)), summary }; return NextResponse.json(response); } catch (err: any) { log.apiFailure({ route: "/api/learn", method: "GET", error: err.message || String(err), userId: auth?.user?.id }); return NextResponse.json({ error: "Something went wrong" }, { status: 500 }); } }

export async function POST(req: Request) { let auth: any = null; try { const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter); if (rateLimitCheck) return rateLimitCheck; auth = await authenticateRequest(req); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { supabase, user } = auth; const body = await req.json(); const { type, subject, topic, difficulty, goal, level } = body; if (type === "course_preview") { const validation = validateRequestBody({ topic, goal, level }, learnCoursePreviewSchema); if (!validation.success) return NextResponse.json({ error: "Validation failed", details: validation.details?.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message })) }, { status: 400 }); } else if (type === "generate_lesson") { const validation = validateRequestBody({ subject, topic, difficulty }, learnGenerateLessonSchema); if (!validation.success) return NextResponse.json({ error: "Validation failed", details: validation.details?.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message })) }, { status: 400 }); }
    if (type === "course_preview") { if (!topic || !goal) return NextResponse.json({ error: "Missing topic or goal" }, { status: 400 }); try { const token = getBearerToken(req); if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { generateCourseDraft } = await import("@/lib/cortex/generateCourse"); return NextResponse.json({ success: true, draft: await generateCourseDraft(token, { topic, goal, level }) }); } catch (e: any) { log.cortexFailure({ userId: user.id, stage: "course_preview", error: e.message || String(e) }); return NextResponse.json({ error: "Course preview failed" }, { status: 500 }); } }
    if (type === "course") { if (!topic || !goal) return NextResponse.json({ error: "Missing topic or goal" }, { status: 400 }); try { const token = getBearerToken(req); if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { generateCourseForUser } = await import("@/lib/cortex/generateCourse"); return NextResponse.json({ success: true, course: await generateCourseForUser(token, { topic, goal, level }) }); } catch (e: any) { log.cortexFailure({ userId: user.id, stage: "course_generation", error: e.message || String(e) }); return NextResponse.json({ error: "Course generation failed" }, { status: 500 }); } }
    if (type === "course_save") { const draft = body.draft; if (!draft || !Array.isArray(draft.lessons) || !draft.lessons.length) return NextResponse.json({ error: "Invalid draft" }, { status: 400 }); const subjName = topic && topic.length <= 60 ? topic : (draft.title ?? `Course: ${topic}`); let subjectId: string | null = null; const { data: existing } = await supabase.from("subjects").select("id").eq("user_id", user.id).eq("name", subjName).maybeSingle(); if (existing?.id) subjectId = existing.id; else { const { data: insertedSub } = await supabase.from("subjects").insert({ user_id: user.id, name: subjName }).select("id").single(); subjectId = insertedSub?.id ?? null; } if (!subjectId) return NextResponse.json({ error: "Failed to resolve subject" }, { status: 500 }); const lessonsToInsert = draft.lessons.map((l: any) => ({ user_id: user.id, subject_id: subjectId, topic: (l.topic ?? topic ?? l.title ?? "").toString().slice(0,500), title: (l.title ?? l.summary ?? "Untitled").toString().slice(0,255), description: (l.summary ?? "").toString().slice(0,1000), difficulty: l.difficulty === "hard" ? "hard" : l.difficulty === "medium" ? "medium" : "easy", blocks: Array.isArray(l.blocks) ? l.blocks : [{ type: "text", content: l.summary ?? "" }], progress: 0 })); const { data: insertedLessons, error: insertLessonsError } = await supabase.from("learn_lessons").insert(lessonsToInsert).select("id, title"); if (insertLessonsError) return NextResponse.json({ success: false, error: `Failed to save lessons: ${insertLessonsError.message}` }, { status: 500 }); const titleToId = new Map(); (insertedLessons ?? []).forEach((r: any) => titleToId.set(r.title, r.id)); const prereqInserts: any[] = []; const unmappedPrereqs: Array<{ lessonTitle: string; missingPrereq: string }> = []; for (const l of draft.lessons) { const lessonTitleKey = (l.title ?? l.summary ?? "").toString().slice(0,255); const insertedId = titleToId.get(lessonTitleKey); if (!insertedId) continue; for (const pTitle of Array.isArray(l.prerequisites) ? l.prerequisites : []) { const pKey = pTitle.toString().slice(0,255); const pid = titleToId.get(pKey); if (pid && pid !== insertedId) prereqInserts.push({ lesson_id: insertedId, prerequisite_lesson_id: pid }); else unmappedPrereqs.push({ lessonTitle: lessonTitleKey, missingPrereq: pKey }); } } const seen = new Set<string>(); const deduped = prereqInserts.filter(r => { const k = `${r.lesson_id}:${r.prerequisite_lesson_id}`; if (seen.has(k)) return false; seen.add(k); return true; }); if (deduped.length) { const { error } = await supabase.from("lesson_prerequisites").insert(deduped); if (error) console.error("prereq insert error:", error); } try { await supabase.from("learning_paths").upsert({ user_id: user.id, title: draft.title ?? subjName, description: draft.description ?? "", updated_at: new Date().toISOString() }, { onConflict: "user_id" }); } catch {} return NextResponse.json({ success: true, lessonsInserted: (insertedLessons ?? []).length, unmappedPrereqs }); }
    if (type !== "lesson") return NextResponse.json({ error: "Invalid type" }, { status: 400 }); if (!subject || !topic) return NextResponse.json({ error: "Missing subject or topic" }, { status: 400 }); const validDifficulty = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium"; const prompt = buildLessonPrompt(subject, topic, validDifficulty); let raw = await callAI(prompt, 7000, { userId: user.id, feature: "lesson_assistant", subfeature: "generate_lesson" }); if (!raw) return NextResponse.json({ error: "All AI providers are currently unavailable. Please try again in a moment." }, { status: 503 }); let parsed = safeParseJSON(raw); if (!parsed) { const repairPrompt = `Repair the following AI lesson into a COMPLETE valid JSON object with 12-16 substantive blocks. Required block types: objective, prior, concept, definition, formula, example, checkpoint, misconception, exam, mistake, summary, practice, tip. Each block must have a type and at least 12 characters of useful student-facing content. Preserve useful subject content, fill missing teaching components, and output no markdown. RESPONSE:\n${raw.slice(0, 18000)}`; const repaired = await callAI(repairPrompt, 5000, { userId: user.id, feature: "lesson_assistant", subfeature: "repair_lesson_json" }); if (repaired) { parsed = safeParseJSON(repaired); raw = repaired; } } if (!parsed?.blocks.length) { log.lessonGenerationFailed({ userId: user.id, subject, topic, difficulty: validDifficulty, error: `AI returned invalid lesson JSON: ${raw.slice(0, 300)}` }); return NextResponse.json({ error: "Couldn't generate a complete lesson on that topic. Please try again or rephrase it." }, { status: 422 }); } let subjectId: string | null = null; const { data: existingSubject } = await supabase.from("subjects").select("id").eq("user_id", user.id).eq("name", subject).maybeSingle(); if (existingSubject?.id) subjectId = existingSubject.id; else { const { data: newSubject } = await supabase.from("subjects").insert({ user_id: user.id, name: subject }).select("id").single(); subjectId = newSubject?.id ?? null; } let savedId: string | null = null; if (subjectId) { const { data: inserted, error: insertError } = await supabase.from("learn_lessons").insert({ user_id: user.id, subject_id: subjectId, topic: topic.trim().slice(0,500), title: parsed.title, description: `A complete ${validDifficulty} lesson on ${topic.trim()}`, difficulty: validDifficulty, progress: 0, blocks: parsed.blocks }).select("id").single(); if (!insertError) { savedId = inserted.id; await awardXPBySource(user.id, "lesson_generation", { difficulty: validDifficulty }); } else log.lessonGenerationFailed({ userId: user.id, subject, topic, difficulty: validDifficulty, error: `Failed to save lesson: ${insertError.message}` }); } if (!savedId) return NextResponse.json({ error: "The lesson was generated but couldn't be saved. Please try again." }, { status: 500 }); return NextResponse.json({ id: savedId, title: parsed.title, blocks: parsed.blocks }); } catch (err: any) { log.apiFailure({ route: "/api/learn", method: "POST", error: err.message || String(err), userId: auth?.user?.id }); return NextResponse.json({ error: "Something went wrong" }, { status: 500 }); } }
export async function PATCH(req: Request) { try { const auth = await authenticateRequest(req); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { supabase, user } = auth; const { lessonId, progress } = await req.json(); if (!lessonId || typeof progress !== "number") return NextResponse.json({ error: "Missing lessonId or progress" }, { status: 400 }); const clamped = Math.min(100, Math.max(0, Math.round(progress))); const { error } = await supabase.from("learn_lessons").update({ progress: clamped, updated_at: new Date().toISOString() }).eq("id", lessonId).eq("user_id", user.id); if (error) return NextResponse.json({ error: "Failed to update progress" }, { status: 500 }); if (clamped === 100) await awardXPBySource(user.id, "lesson_completion"); return NextResponse.json({ success: true, progress: clamped }); } catch { return NextResponse.json({ error: "Something went wrong" }, { status: 500 }); } }
