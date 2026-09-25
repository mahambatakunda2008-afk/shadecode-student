import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { LearnDetailResponse, LearnLesson, LearnListResponse, LearnSubject, LessonDifficulty } from "@/app/(app)/learn/types";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { learnCoursePreviewSchema, learnGenerateLessonSchema, validateRequestBody } from "@/lib/validation/schemas";
import { callAI } from "@/lib/ai";
import { awardXPBySource } from "@/lib/xp/manager";
import { normalizeSubjectKey, normalizeSubjectNames } from "@/lib/academic/subjectContract";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";
import { log } from "@/lib/observability";
import { buildDeepLessonPrompt, buildLessonRepairPrompt, lessonQualityScore } from "@/lib/learn/contentQuality";
import { resolveLessonRequest, buildResolvedLessonPrompt } from "@/lib/cortex/lessonRequest";
import { lessonQualityFailures, normalizeLessonBlockType } from "@/lib/cortex/lessonQuality";
import { buildDeterministicLessonFallback } from "@/lib/cortex/lessonFallback";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

interface SubjectRow { id: string; name: string; }
interface ProfileRow { xp: number | null; streak: number | null; level: number | null; }
interface LessonBlock { type: string; title?: string; content: string; formula?: string; example?: { question: string; answer: string }; options?: string[]; answer?: string; }
interface LearnLessonRow { id: string; subject_id: string; topic: string | null; title: string; description: string | null; difficulty: string | null; progress: number | null; updated_at: string | null; blocks: LessonBlock[] | null; }
interface AuthContext { supabase: SupabaseClient; user: User; }

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7).trim() || null : null;
}
async function authenticateRequest(req: Request): Promise<AuthContext | null> {
  const admin = getSupabaseAdmin();
  const token = getBearerToken(req);
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
        setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} },
      },
    });
    const { data: { user }, error } = await sessionClient.auth.getUser();
    return error || !user ? null : { supabase: admin, user };
  } catch { return null; }
}
function normalizeDifficulty(v: string | null): LessonDifficulty { return v === "medium" || v === "hard" ? v : "easy"; }
function clampProgress(v: number | null): number { return typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 0; }
function toLearnLesson(row: LearnLessonRow, subjectById: Map<string, string>) {
  const progress = clampProgress(row.progress);
  return { id: row.id, subjectId: row.subject_id, topic: row.topic ?? undefined, subject: subjectById.get(row.subject_id) ?? "Unknown subject", title: row.title, description: row.description ?? "", difficulty: normalizeDifficulty(row.difficulty), progress, completed: progress >= 100, updated_at: row.updated_at ?? undefined, blocks: row.blocks ?? undefined } as LearnLesson;
}
function buildSubjectTabs(subjects: SubjectRow[], lessons: LearnLessonRow[]): LearnSubject[] {
  const counts = lessons.reduce<Record<string, number>>((acc, l) => { acc[l.subject_id] = (acc[l.subject_id] ?? 0) + 1; return acc; }, {});
  return subjects.map(s => ({ id: s.id, name: s.name, lessonCount: counts[s.id] ?? 0 }));
}
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
  const blocks = p.blocks.filter((b): b is LessonBlock => !!b && typeof b === "object" && typeof (b as LessonBlock).type === "string" && typeof (b as LessonBlock).content === "string" && (b as LessonBlock).content.trim().length >= 40).slice(0, 28);
  const required = new Set(["objective", "concept", "example", "checkpoint", "exam", "mistake", "summary"]);
  const types = new Set(blocks.map(b => normalizeLessonBlockType(b.type)));
  if (blocks.length < 14 || ![...required].every(type => types.has(type))) return null;
  return { title: p.title.trim().slice(0, 255), blocks };
}
function safeParseSectionJSON(raw: string): { title: string; blocks: LessonBlock[] } | null {
  const json = extractJSONObject(raw);
  if (!json) return null;
  try {
    const value = JSON.parse(json) as { title?: unknown; blocks?: unknown };
    if (typeof value.title !== "string" || !Array.isArray(value.blocks)) return null;
    const blocks = value.blocks.filter((b): b is LessonBlock =>
      !!b && typeof b === "object" &&
      typeof (b as LessonBlock).type === "string" &&
      typeof (b as LessonBlock).content === "string" &&
      (b as LessonBlock).content.trim().length >= 40
    ).slice(0, 6);
    return blocks.length >= 3 ? { title: value.title.trim().slice(0,255), blocks } : null;
  } catch { return null; }
}
function safeParseJSON(raw: string): { title: string; blocks: LessonBlock[] } | null {
  const candidates = [extractJSONObject(raw), extractJSONObject(cleanJsonText(raw)), extractJSONObject(raw.replace(/\\/g, ""))].filter((v): v is string => Boolean(v));
  for (const candidate of candidates) { try { const parsed = validateLesson(JSON.parse(candidate)); if (parsed) return parsed; } catch {} }
  return null;
}
async function resolveLessonSubject(supabase: SupabaseClient, userId: string, requested: string, topic: string) {
  const { data: subjects } = await supabase.from("subjects").select("id, name").eq("user_id", userId);
  const rows = (subjects ?? []) as SubjectRow[];
  const requestedName = (requested ?? "").trim();
  const exact = rows.find(s => s.name.toLowerCase() === requestedName.toLowerCase());
  if (exact) return exact;
  if (requestedName.toLowerCase() !== "general" && requestedName) {
    const existing = rows.find(s => s.name.toLowerCase().includes(requestedName.toLowerCase()) || requestedName.toLowerCase().includes(s.name.toLowerCase()));
    if (existing) return existing;
  }
  const topicLower = topic.toLowerCase();
  const inferred = rows.find(s => s.name.length > 2 && topicLower.includes(s.name.toLowerCase()));
  if (inferred) return inferred;
  if (requestedName && requestedName.toLowerCase() !== "general") {
    const { data: created } = await supabase.from("subjects").insert({ user_id: userId, name: requestedName }).select("id, name").single();
    if (created) return created as SubjectRow;
  }
  return rows.find(s => s.name.toLowerCase() === "general") ?? null;
}

export async function GET(req: Request) {
  let auth: AuthContext | null = null;
  try {
    auth = await authenticateRequest(req); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(req.url); const subjectId = url.searchParams.get("subjectId") ?? "all"; const lessonId = url.searchParams.get("lessonId"); const { supabase, user } = auth;
    const [{ data: profileData }, { data: subjectRows, error: subjectsError }] = await Promise.all([
      supabase.from("profiles").select("xp, streak, level, subjects").eq("id", user.id).maybeSingle(),
      supabase.from("subjects").select("id, name").eq("user_id", user.id).order("name", { ascending: true }),
    ]);
    if (subjectsError) console.error("Subjects query error:", subjectsError);
    const profile = profileData as (ProfileRow & { subjects?: unknown }) | null;
    const allowedSubjectNames = normalizeSubjectNames(profile?.subjects);
    const allowedKeys = new Set(allowedSubjectNames.map(name => normalizeSubjectKey(name)));
    const subjects = ((subjectRows ?? []) as SubjectRow[]).filter(s => allowedKeys.has(normalizeSubjectKey(s.name)));
    const subjectById = new Map(subjects.map(s => [s.id, s.name])); const level = profile?.level ?? 1;
    const summary = { currentXP: profile?.xp ?? 0, currentStreak: profile?.streak ?? 0, level, xpGoal: Math.max(100, level * 100) };
    if (lessonId) {
      const { data: lessonData, error: lessonError } = await supabase.from("learn_lessons").select("id, subject_id, topic, title, description, difficulty, progress, updated_at, blocks").eq("user_id", user.id).eq("id", lessonId).maybeSingle();
      if (lessonError) return NextResponse.json({ error: "Unable to load lesson." }, { status: 500 });
      if (!lessonData) return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
      const response: LearnDetailResponse = { lesson: toLearnLesson(lessonData as LearnLessonRow, subjectById) }; return NextResponse.json(response);
    }
    const { data: allLessonData, error: allLessonsError } = await supabase.from("learn_lessons").select("id, subject_id, topic, title, description, difficulty, progress, updated_at, blocks").eq("user_id", user.id).order("updated_at", { ascending: false });
    if (allLessonsError) return NextResponse.json({ subjects: buildSubjectTabs(subjects, []), lessons: [], summary });
    const allLessons = (allLessonData ?? []) as LearnLessonRow[]; const filtered = subjectId === "all" ? allLessons : allLessons.filter(l => l.subject_id === subjectId);
    const response: LearnListResponse = { subjects: buildSubjectTabs(subjects, allLessons), lessons: filtered.map(l => toLearnLesson(l, subjectById)), summary }; return NextResponse.json(response);
  } catch (err: any) {
    log.apiFailure({ route: "/api/learn", method: "GET", error: err.message || String(err), userId: auth?.user?.id }); return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let auth: AuthContext | null = null;
  try {
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter); if (rateLimitCheck) return rateLimitCheck;
    auth = await authenticateRequest(req); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, user } = auth; const body = await req.json(); const { type, subject, topic, difficulty, goal, level, generationJobId } = body;
    if (type === "course_preview") {
      const validation = validateRequestBody({ topic, goal, level }, learnCoursePreviewSchema); if (!validation.success) return NextResponse.json({ error: "Validation failed", details: validation.details?.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message })) }, { status: 400 });
      if (!topic || !goal) return NextResponse.json({ error: "Missing topic or goal" }, { status: 400 });
      try { const token = getBearerToken(req); if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { generateCourseDraft } = await import("@/lib/cortex/generateCourse"); return NextResponse.json({ success: true, draft: await generateCourseDraft(token, { topic, goal, level }) }); }
      catch (e: any) { log.cortexFailure({ userId: user.id, stage: "course_preview", error: e.message || String(e) }); return NextResponse.json({ error: "Course preview failed" }, { status: 500 }); }
    }
    if (type === "course") {
      if (!topic || !goal) return NextResponse.json({ error: "Missing topic or goal" }, { status: 400 });
      try { const token = getBearerToken(req); if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { generateCourseForUser } = await import("@/lib/cortex/generateCourse"); return NextResponse.json({ success: true, course: await generateCourseForUser(token, { topic, goal, level }) }); }
      catch (e: any) { log.cortexFailure({ userId: user.id, stage: "course_generation", error: e.message || String(e) }); return NextResponse.json({ error: "Course generation failed" }, { status: 500 }); }
    }
    if (type === "course_save") {
      const draft = body.draft; if (!draft || !Array.isArray(draft.lessons) || !draft.lessons.length) return NextResponse.json({ error: "Invalid draft" }, { status: 400 });
      const subjName = topic && topic.length <= 60 ? topic : (draft.title ?? `Course: ${topic}`); let subjectId: string | null = null;
      const { data: existing } = await supabase.from("subjects").select("id").eq("user_id", user.id).eq("name", subjName).maybeSingle();
      if (existing?.id) subjectId = existing.id; else { const { data: insertedSub } = await supabase.from("subjects").insert({ user_id: user.id, name: subjName }).select("id").single(); subjectId = insertedSub?.id ?? null; }
      if (!subjectId) return NextResponse.json({ error: "Failed to resolve subject" }, { status: 500 });
      const lessonsToInsert = draft.lessons.map((l: any) => ({ user_id: user.id, subject_id: subjectId, topic: (l.topic ?? topic ?? l.title ?? "").toString().slice(0,500), title: (l.title ?? l.summary ?? "Untitled").toString().slice(0,255), description: (l.summary ?? "").toString().slice(0,1500), difficulty: l.difficulty === "hard" ? "hard" : l.difficulty === "medium" ? "medium" : "easy", blocks: Array.isArray(l.blocks) ? l.blocks : [{ type: "text", content: l.summary ?? "" }], progress: 0 }));
      const { data: insertedLessons, error: insertLessonsError } = await supabase.from("learn_lessons").insert(lessonsToInsert).select("id, title");
      if (insertLessonsError) return NextResponse.json({ success: false, error: `Failed to save lessons: ${insertLessonsError.message}` }, { status: 500 });
      const titleToId = new Map<string, string>(); (insertedLessons ?? []).forEach((r: any) => titleToId.set(r.title, r.id)); const prereqInserts: any[] = []; const unmappedPrereqs: Array<{ lessonTitle: string; missingPrereq: string }> = [];
      for (const l of draft.lessons) { const lessonTitleKey = (l.title ?? l.summary ?? "").toString().slice(0,255); const insertedId = titleToId.get(lessonTitleKey); if (!insertedId) continue; for (const pTitle of Array.isArray(l.prerequisites) ? l.prerequisites : []) { const pKey = pTitle.toString().slice(0,255); const pid = titleToId.get(pKey); if (pid && pid !== insertedId) prereqInserts.push({ lesson_id: insertedId, prerequisite_lesson_id: pid }); else unmappedPrereqs.push({ lessonTitle: lessonTitleKey, missingPrereq: pKey }); } }
      const seen = new Set<string>(); const deduped = prereqInserts.filter(r => { const k = `${r.lesson_id}:${r.prerequisite_lesson_id}`; if (seen.has(k)) return false; seen.add(k); return true; }); if (deduped.length) { const { error } = await supabase.from("lesson_prerequisites").insert(deduped); if (error) console.error("prereq insert error:", error); }
      try { await supabase.from("learning_paths").upsert({ user_id: user.id, title: draft.title ?? subjName, description: draft.description ?? "", updated_at: new Date().toISOString() }, { onConflict: "user_id" }); } catch {}
      return NextResponse.json({ success: true, lessonsInserted: (insertedLessons ?? []).length, unmappedPrereqs });
    }
    if (type !== "lesson" && type !== "generate_lesson") return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    const validation = validateRequestBody({ type: "generate_lesson", subject, topic, difficulty }, learnGenerateLessonSchema);
    if (!validation.success) return NextResponse.json({ error: "Validation failed", details: validation.details?.issues.map((e: any) => ({ field: e.path.join('.'), message: e.message })) }, { status: 400 });
    if (!topic) return NextResponse.json({ error: "Missing topic" }, { status: 400 });

    const requestedSubject = typeof subject === "string" ? subject.trim() : "";
    const subjectAccess = await resolveLearnerSubject(supabase, user.id, requestedSubject);
    if (!subjectAccess.ok) return NextResponse.json({ error: subjectAccess.error }, { status: subjectAccess.status });
    const effectiveSubject = subjectAccess.subject;
    const resolvedSubject = { id: subjectAccess.subjectId, name: subjectAccess.subject };
    const validDifficulty: LessonDifficulty = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium";
    const request = resolveLessonRequest({
      prompt: topic.trim(),
      subject: effectiveSubject,
      topic: topic.trim(),
      level: typeof level === "string" ? level : undefined,
      difficulty: validDifficulty,
      goal: typeof goal === "string" ? goal : undefined,
      examBoard: typeof body.examBoard === "string" ? body.examBoard : undefined,
    });
    const durableJobId = generationJobId && /^[0-9a-f-]{36}$/i.test(String(generationJobId)) ? String(generationJobId) : null;
    const generationMode = body.generationMode === "section" || body.generationMode === "persist" ? body.generationMode : "complete";
    const generationSectionIndex = Number.isInteger(body.generationSectionIndex) ? Number(body.generationSectionIndex) : 0;
    const generationSectionCount = Number.isInteger(body.generationSectionCount) ? Number(body.generationSectionCount) : (request.broadTopic ? 6 : 4);
    const priorBlocks = Array.isArray(body.priorBlocks) ? body.priorBlocks.slice(-12) : [];

    if (generationMode === "persist") {
      const generated = body.generatedLesson;
      if (!generated || typeof generated !== "object" || typeof generated.title !== "string" || !Array.isArray(generated.blocks)) {
        return NextResponse.json({ error: "Invalid generated lesson payload." }, { status: 400 });
      }

      const candidate = validateLesson(generated);
      const normalizedGeneratedBlocks = Array.isArray(generated.blocks)
        ? generated.blocks.filter((block: unknown): block is LessonBlock =>
            !!block &&
            typeof block === "object" &&
            typeof (block as LessonBlock).type === "string" &&
            typeof (block as LessonBlock).content === "string" &&
            (block as LessonBlock).content.trim().length >= 40
          ).slice(0, 28)
        : [];
      const minimumPersistBlocks = request.broadTopic ? 16 : 10;
      const persistableCandidate = candidate ?? (
        typeof generated.title === "string" &&
        generated.title.trim().length > 0 &&
        normalizedGeneratedBlocks.length >= minimumPersistBlocks
          ? { title: generated.title.trim().slice(0, 255), blocks: normalizedGeneratedBlocks }
          : null
      );
      if (!persistableCandidate) {
        return NextResponse.json({ error: "Generated lesson failed the server lesson contract.", retryable: true }, { status: 422 });
      }

      const quality = lessonQualityFailures(persistableCandidate, request).failures;
      if (quality.length > 0) {
        return NextResponse.json({
          error: "Generated lesson failed the learning-quality checks.",
          failures: quality,
          retryable: true,
        }, { status: 422 });
      }

      const finalScore = lessonQualityScore(persistableCandidate.blocks);
      if (finalScore < 45) {
        return NextResponse.json({ error: "Generated lesson did not meet the depth standard.", retryable: true }, { status: 422 });
      }

      const lessonRow = {
        user_id: user.id,
        subject_id: resolvedSubject.id,
        topic: request.topic.slice(0, 500),
        title: persistableCandidate.title,
        description: `A deep ${validDifficulty} lesson on ${request.topic}`,
        difficulty: validDifficulty,
        progress: 0,
        blocks: persistableCandidate.blocks,
        updated_at: new Date().toISOString(),
      };

      let savedId = durableJobId;
      let saveError: any = null;
      if (durableJobId) {
        const { data: updated, error } = await supabase.from("learn_lessons")
          .update(lessonRow)
          .eq("id", durableJobId)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle();
        savedId = updated?.id ?? durableJobId;
        saveError = error;
      } else {
        const { data: inserted, error } = await supabase.from("learn_lessons")
          .insert(lessonRow)
          .select("id")
          .single();
        savedId = inserted?.id ?? null;
        saveError = error;
      }

      if (saveError || !savedId) {
        return NextResponse.json({ error: "The lesson was generated but could not be saved.", retryable: true }, { status: 500 });
      }

      await awardXPBySource(user.id, "lesson_generation", { difficulty: validDifficulty });
      return NextResponse.json({
        id: savedId,
        title: persistableCandidate.title,
        blocks: persistableCandidate.blocks,
        qualityScore: finalScore,
        subject: effectiveSubject,
      });
    }

    if (generationMode === "section") {
      const sectionJobs = request.broadTopic
        ? [
            "Orient the learner: define the territory, prerequisites, vocabulary, and why the topic matters.",
            "Teach the first major concepts deeply, including relationships and underlying reasoning.",
            "Teach the next major concepts deeply, including mechanisms, structures, formulas, or processes where relevant.",
            "Connect the ideas with worked examples, applications, comparisons, and step-by-step reasoning.",
            "Handle misconceptions, common mistakes, exam-style thinking, and how to recognise what a question is testing.",
            "Synthesize the whole topic, connect the pieces, add curiosity/application, and give a clear next step.",
          ]
        : [
            "Build the foundation: prerequisites, vocabulary, core idea, and mental model.",
            "Teach the main concepts deeply with explanations, relationships, and a worked example.",
            "Extend the understanding with applications, comparisons, mechanisms/formulas, and common mistakes.",
            "Consolidate with exam/practice thinking, synthesis, checkpoint prompts, and a useful next step.",
          ];
      const sectionJob = sectionJobs[generationSectionIndex] ?? sectionJobs[sectionJobs.length - 1];
      const sectionPrompt = [
        `Generate section ${generationSectionIndex + 1} of ${generationSectionCount} for a coherent lesson.`,
        buildResolvedLessonPrompt(request),
        buildDeepLessonPrompt(effectiveSubject, request.topic, validDifficulty),
        `SECTION JOB: ${sectionJob}`,
        `PREVIOUS MATERIAL (avoid unnecessary repetition): ${JSON.stringify(priorBlocks)}`,
        "TEACHING CONTRACT: teach deeply, stay inside the exact subject/topic, explain why/how, use concrete examples, avoid invented syllabus claims, and do not put answers inside checkpoints.",
        "Return ONLY JSON with a top-level title string and blocks array; each block must contain type, optional title, and content.",
        "Use 3-5 substantive blocks. Content must be at least 40 characters per block.",
      ].join("\n\n");
      let rawSection: string | null = null;
      let section: { title: string; blocks: LessonBlock[] } | null = null;
      let sectionFailures: string[] = [];

      for (let attempt = 0; attempt < 3 && !section; attempt += 1) {
        const sectionRequestPrompt: string = attempt === 0
          ? sectionPrompt
          : `${sectionPrompt}

REPAIR PASS ${attempt}
The previous section failed these checks:
${sectionFailures.map((failure) => `- ${failure}`).join("\n") || "- malformed or unusable structured output"}

Previous candidate:
${rawSection?.slice(0, 14000) || "No usable candidate was returned."}

Repair only the defective section. Preserve correct material where possible. Do not shorten the teaching merely to satisfy the schema. Return ONLY valid JSON.`;
        rawSection = await callAI(sectionRequestPrompt, 2200, {
          userId: user.id, feature: "lesson_assistant", subfeature: attempt === 0 ? "generate_lesson_section" : "repair_lesson_section",
          maxChainMs: attempt === 0 ? 22000 : 16000, perProviderMaxMs: 6000,
        }).catch((error) => {
          console.warn("[LEARN] section generation attempt failed", { attempt, error: error instanceof Error ? error.message : String(error) });
          return null;
        });

        // A null AI response means the provider chain was exhausted, not that the
        // section merely needs another schema repair. Do not burn another 16-22s
        // retrying the same dead provider chain.
        if (!rawSection) {
          return NextResponse.json({
            error: "Cortex providers are currently unavailable. Switch to a local recovery lane or retry later.",
            retryable: false,
            providerUnavailable: true,
          }, { status: 503 });
        }

        section = safeParseSectionJSON(rawSection);
        if (!section) {
          sectionFailures = ["invalid-section-json-or-structure"];
          continue;
        }

        const sectionQuality = lessonQualityFailures({
          title: section.title,
          blocks: section.blocks.map((block) => ({
            type: block.type,
            title: block.title,
            content: block.content,
          })),
        }, request);

        sectionFailures = sectionQuality.failures.filter((failure) =>
          !["insufficient-structure", "deep-session-too-thin", "broad-topic-too-thin", "deep-content-too-thin", "deep-examples-too-thin", "deep-checkpoints-too-thin", "deep-continuation-missing", "objective", "summary", "teach-example", "exam"].includes(failure)
        );

        if (sectionFailures.length > 0) section = null;
      }

      if (!section) {
        return NextResponse.json({
          error: "This lesson section could not be made reliable yet. The generation state is preserved for resume/retry.",
          retryable: true,
        }, { status: 503 });
      }
      const currentBlocks = [...priorBlocks, ...section.blocks].slice(-28);
      if (durableJobId) {
        const update = await supabase.from("learn_lessons").update({
          title: (generationSectionIndex === 0 ? section.title : `Cortex is building ${request.topic}`).slice(0,255),
          topic: request.topic.slice(0,500),
          description: "Generation is resumable. Partial sections are saved as they complete.",
          difficulty: validDifficulty,
          progress: Math.min(99, Math.round(((generationSectionIndex + 1) / generationSectionCount) * 90)),
          blocks: currentBlocks,
          updated_at: new Date().toISOString(),
        }).eq("id", durableJobId).eq("user_id", user.id).select("id").maybeSingle();
        if (update.error) return NextResponse.json({ error: "The section was generated but could not be persisted.", retryable: true }, { status: 500 });
      }
      return NextResponse.json({
        sectionIndex: generationSectionIndex,
        sectionCount: generationSectionCount,
        title: section.title,
        blocks: section.blocks,
        partialBlocks: currentBlocks,
        complete: generationSectionIndex + 1 >= generationSectionCount,
      });
    }

    const prompt = [
      buildResolvedLessonPrompt(request),
      buildDeepLessonPrompt(effectiveSubject, request.topic, validDifficulty),
      "\nRESUMABLE GENERATION CONTRACT",
      "This request may be resumed after an interrupted generation run. Return a complete lesson for the exact request. Do not rely on hidden prior output.",
      "For broad topics, follow the curriculum map and give every major branch substantive treatment. Do not spend the whole lesson on the first branch.",
    ].join("\n\n");

    // Persist the generation identity before model work begins. A timeout, browser refresh,
    // or provider outage can now resume the same lesson instead of creating a new one.
    if (durableJobId && resolvedSubject.id) {
      const { data: existingJob } = await supabase.from("learn_lessons")
        .select("id,title,blocks,topic,subject_id")
        .eq("id", durableJobId).eq("user_id", user.id).maybeSingle();
      if (existingJob?.id && Array.isArray(existingJob.blocks) && existingJob.blocks.length > 0) {
        return NextResponse.json({
          id: existingJob.id, title: existingJob.title, blocks: existingJob.blocks,
          qualityScore: lessonQualityScore(existingJob.blocks as LessonBlock[]),
          subject: effectiveSubject, recovered: true,
        });
      }
      if (!existingJob?.id) {
        await supabase.from("learn_lessons").insert({
          id: durableJobId, user_id: user.id, subject_id: resolvedSubject.id,
          topic: request.topic.slice(0, 500),
          title: `Cortex is building ${request.topic}`.slice(0, 255),
          description: "Generation is resumable. This draft is not yet complete.",
          difficulty: validDifficulty, progress: 0, blocks: [],
        });
      }
    }

    // One bounded primary pass, followed by targeted repair. Repair is driven by concrete
    // quality failures instead of blindly regenerating an already-good lesson.
    let raw: string | null = null;
    try {
      raw = await callAI(prompt, 5000, {
        userId: user.id, feature: "lesson_assistant", subfeature: "generate_deep_lesson",
        maxChainMs: 24000, perProviderMaxMs: 6500,
      });
    } catch (error) {
      console.warn("[LEARN] primary lesson generation failed", error instanceof Error ? error.message : String(error));
    }

    let parsed = raw ? safeParseJSON(raw) : null;
    let failures = parsed ? lessonQualityFailures(parsed, request).failures : ["generation-unavailable-or-invalid-json"];

    if (!parsed || failures.length > 0) {
      for (let repairAttempt = 0; repairAttempt < 2 && failures.length > 0; repairAttempt += 1) {
        if (!raw) break;
        try {
          const repairPrompt = buildLessonRepairPrompt(
            effectiveSubject,
            request.topic,
            raw,
            `Learner level: ${level || "unspecified"}\nExam board: ${body.examBoard || "unspecified"}\nResolved request: ${buildResolvedLessonPrompt(request)}`,
            validDifficulty,
            failures,
          ) + `
REPAIR PASS: ${repairAttempt + 1}
Do not rewrite good material just for variety. Fix the named defects. Preserve accurate explanations, examples and reasoning. The repaired lesson must be internally coherent and must pass the quality gate, not merely contain more blocks.
Return only valid JSON.`;
          const repaired = await callAI(repairPrompt, 4600, {
            userId: user.id, feature: "lesson_assistant", subfeature: "targeted_lesson_repair",
            maxChainMs: 16000, perProviderMaxMs: 6000,
          });
          const repairedParsed = repaired ? safeParseJSON(repaired) : null;
          if (!repairedParsed) {
            failures = ["repair-returned-invalid-json"];
            continue;
          }
          const repairedFailures = lessonQualityFailures(repairedParsed, request).failures;
          if (repairedFailures.length === 0) {
            parsed = repairedParsed;
            failures = [];
            break;
          }
          if (repairedFailures.length < failures.length) {
            parsed = repairedParsed;
            failures = repairedFailures;
            raw = repaired;
          }
        } catch (error) {
          console.warn("[LEARN] targeted lesson repair failed", error instanceof Error ? error.message : String(error));
        }
      }
    }

    // Curated recovery is the final safety net for known high-traffic topics. It is never
    // represented as AI output and never pretends to cover unsupported curriculum.
    if (!parsed?.blocks.length) {
      const fallback = buildDeterministicLessonFallback(effectiveSubject, request.topic);
      if (fallback) { parsed = fallback; failures = lessonQualityFailures(parsed, request).failures; }
    }

    if (!parsed?.blocks.length || failures.length > 0) {
      log.lessonGenerationFailed({
        userId: user.id, subject: effectiveSubject, topic, difficulty: validDifficulty,
        error: `Lesson pipeline exhausted: ${failures.join(" | ")}`,
      });
      if (durableJobId) {
        await supabase.from("learn_lessons").update({
          title: `Cortex is retrying ${request.topic}`.slice(0, 255),
          description: "Generation did not finish this pass. The same request can resume safely.",
          updated_at: new Date().toISOString(),
        }).eq("id", durableJobId).eq("user_id", user.id);
      }
      return NextResponse.json({
        error: "Cortex could not finish this lesson in this run. The request is preserved and can resume safely.",
        retryable: true,
      }, { status: 503 });
    }

    const finalScore = lessonQualityScore(parsed.blocks);
    if (finalScore < 45) {
      return NextResponse.json({
        error: "The lesson did not meet the depth standard yet. Cortex preserved the request for another recovery pass.",
        retryable: true,
      }, { status: 503 });
    }
    let subjectId = resolvedSubject.id;
    if (!subjectId && effectiveSubject) {
      const { data: existingSubject } = await supabase.from("subjects").select("id").eq("user_id", user.id).eq("name", effectiveSubject).maybeSingle();
      if (existingSubject?.id) subjectId = existingSubject.id;
      else { const { data: newSubject } = await supabase.from("subjects").insert({ user_id: user.id, name: effectiveSubject }).select("id").single(); subjectId = newSubject?.id ?? null; }
    }
    if (!subjectId) return NextResponse.json({ error: "Unable to resolve the lesson subject." }, { status: 500 });

    const lessonRow = {
      user_id: user.id, subject_id: subjectId, topic: request.topic.slice(0, 500),
      title: parsed.title, description: `A deep ${validDifficulty} lesson on ${request.topic}`,
      difficulty: validDifficulty, progress: 0, blocks: parsed.blocks,
      updated_at: new Date().toISOString(),
    };
    let savedId = durableJobId;
    let saveError: any = null;
    if (durableJobId) {
      const { data: updated, error } = await supabase.from("learn_lessons")
        .update(lessonRow).eq("id", durableJobId).eq("user_id", user.id).select("id").maybeSingle();
      savedId = updated?.id ?? durableJobId;
      saveError = error;
    } else {
      const { data: inserted, error } = await supabase.from("learn_lessons").insert(lessonRow).select("id").single();
      savedId = inserted?.id ?? null;
      saveError = error;
    }
    if (saveError || !savedId) {
      log.lessonGenerationFailed({ userId: user.id, subject: effectiveSubject, topic, difficulty: validDifficulty, error: `Failed to save lesson: ${saveError?.message || "no lesson id"}` });
      return NextResponse.json({ error: "The lesson was generated but could not be saved. Cortex will retry safely.", retryable: true }, { status: 500 });
    }
    await awardXPBySource(user.id, "lesson_generation", { difficulty: validDifficulty });
    return NextResponse.json({ id: savedId, title: parsed.title, blocks: parsed.blocks, qualityScore: finalScore, subject: effectiveSubject });
  } catch (err: any) {
    log.apiFailure({ route: "/api/learn", method: "POST", error: err.message || String(err), userId: auth?.user?.id }); return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await authenticateRequest(req); if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { supabase, user } = auth; const { lessonId, progress } = await req.json(); if (!lessonId || typeof progress !== "number") return NextResponse.json({ error: "Missing lessonId or progress" }, { status: 400 });
    const clamped = Math.min(100, Math.max(0, Math.round(progress))); const { error } = await supabase.from("learn_lessons").update({ progress: clamped, updated_at: new Date().toISOString() }).eq("id", lessonId).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Failed to update progress" }, { status: 500 }); if (clamped === 100) await awardXPBySource(user.id, "lesson_completion"); return NextResponse.json({ success: true, progress: clamped });
  } catch { return NextResponse.json({ error: "Something went wrong" }, { status: 500 }); }
}