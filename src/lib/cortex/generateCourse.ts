import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { callAI as sharedCallAI } from "@/lib/ai";
import { repairAndParseJSON } from "@/lib/ai/parseJson";
import { buildDeepLessonPrompt } from "@/lib/learn/contentQuality";
import { formatCurriculumPlan, planCurriculum } from "@/lib/learn/curriculumPlanner";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export let aiCaller = async function callAI(prompt: string, maxTokens = 2500, userId?: string): Promise<string | null> {
  return sharedCallAI(prompt, maxTokens, { userId, feature: "course_generation", subfeature: "generate_course" });
};
export function setAiCaller(fn: (prompt: string, maxTokens?: number, userId?: string) => Promise<string | null>) { aiCaller = fn; }

function moderateDraft(draft: any) {
  const issues: string[] = [];
  const banned = ["fuck", "shit", "bitch", "idiot", "sex"];
  const text = (JSON.stringify(draft) || "").toLowerCase();
  for (const b of banned) if (text.includes(b)) issues.push(`Profanity detected: ${b}`);
  if (/https?:\/\//.test(text)) issues.push("Contains external links — review for safety");
  if ((draft.lessons?.length ?? 0) > 40) issues.push("Large number of lessons (>40) — consider reducing");
  for (const l of draft.lessons ?? []) {
    if ((l.summary ?? "").length < 100) issues.push(`Lesson '${l.title}' summary too short`);
    if ((l.blocks ?? []).length < 8) issues.push(`Lesson '${l.title}' needs more teaching blocks`);
  }
  return issues;
}

function isCoursePayload(value: unknown): value is { title?: unknown; description?: unknown; lessons: unknown[]; projects?: unknown[]; checkpoints?: unknown[]; assessments?: unknown[] } {
  return !!value && typeof value === "object" && Array.isArray((value as { lessons?: unknown }).lessons);
}

function normalizeLessons(lessons: unknown[]) {
  return lessons.filter(l => !!l && typeof l === "object").slice(0, 50).map((l: any) => ({
    title: (l.title ?? l.summary ?? "Untitled").toString().slice(0, 255),
    summary: (l.summary ?? "").toString().slice(0, 1500),
    difficulty: l.difficulty === "hard" ? "hard" : l.difficulty === "medium" ? "medium" : "easy",
    estimatedMinutes: typeof l.estimatedMinutes === "number" ? Math.max(10, Math.min(240, Math.round(l.estimatedMinutes))) : 40,
    blocks: Array.isArray(l.blocks) && l.blocks.length ? l.blocks.slice(0, 36) : [{ type: "text", content: (l.summary ?? "").toString().slice(0, 1500) }],
    prerequisites: Array.isArray(l.prerequisites) ? l.prerequisites.map((p: any) => p.toString().slice(0, 255)).slice(0, 20) : [],
  }));
}

export async function generateCourseDraft(userToken: string, params: { topic: string; goal: string; level?: string }) {
  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(userToken);
  if (error || !user) throw new Error("Unauthorized");
  const topic = params.topic.trim().slice(0, 200);
  const goal = params.goal.trim().slice(0, 500);
  const level = params.level?.trim().slice(0, 80) || "beginner";
  if (!topic || !goal) throw new Error("Topic and goal are required.");

  try {
    const { data: profileData } = await supabase.from("user_profiles").select("last_course_generated_at").eq("user_id", user.id).maybeSingle();
    const last = profileData?.last_course_generated_at;
    if (last) {
      const elapsed = Date.now() - new Date(last).getTime();
      const hour = 60 * 60 * 1000;
      if (elapsed < hour) throw new Error(`Cooldown: please wait ${Math.ceil((hour - elapsed) / 60000)} minutes before generating another course.`);
    }
  } catch (e) { if (e instanceof Error && e.message.startsWith("Cooldown")) throw e; }

  const plan = planCurriculum(topic);
  const planContext = formatCurriculumPlan(topic);
  const prompt = `${buildDeepLessonPrompt(topic, topic, "medium")}

COURSE MODE: This request is a learning journey, not a single oversized lesson. The curriculum map below is the backbone. Create one lesson for each major unit where practical. Do not merge the whole map into a shallow overview. Do not invent filler units merely to hit a number.

${planContext}

COURSE GOAL: ${goal}
LEARNER LEVEL: ${level}

COURSE DESIGN RULES
- The course must have ${plan.isBroad ? "8-16" : "3-8"} lessons, depending on the true scope. For broad topics, cover the major units in the map in order.
- Lesson titles must correspond to real concepts, not generic labels such as "Introduction" or "Advanced Topics" unless they accurately describe the unit.
- Each lesson must have a distinct learning outcome and a substantive summary.
- Each lesson must contain 10-16 useful blocks. Its content must be deep enough to stand alone while connecting to the previous and next lessons.
- Build prerequisites forward. A lesson may depend only on earlier lesson titles, and the first lesson should have no artificial prerequisites.
- The final lessons must synthesize the course, handle unfamiliar problems, and open genuine extension questions.
- Include curiosity in multiple lessons, not just the final lesson.
- Preserve the requested learner level while never equating beginner-friendly with shallow.

Return ONLY valid JSON:
{"title":"...","description":"...","lessons":[{"title":"...","summary":"substantive overview","difficulty":"easy|medium|hard","estimatedMinutes":30,"blocks":[{"type":"...","title":"...","content":"substantive teaching content"}],"prerequisites":["exact earlier lesson title"]}],"projects":[],"checkpoints":[],"assessments":[]}

Before returning, silently verify that the sequence forms a coherent learning journey, every mapped major unit is represented, prerequisites are acyclic and useful, and the course would still make sense if the learner studied it from beginning to end.`;

  const raw = await aiCaller(prompt, 12000, user.id);
  if (!raw) throw new Error("AI unavailable or curriculum grounding unavailable");
  const parsed = repairAndParseJSON(raw, isCoursePayload);
  if (!parsed || parsed.lessons.length === 0) throw new Error("Invalid course structure returned by AI");

  const lessons = normalizeLessons(parsed.lessons);
  if (!lessons.length) throw new Error("AI returned no usable lessons");
  const normalized = { title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim().slice(0, 255) : topic, description: typeof parsed.description === "string" ? parsed.description.slice(0, 3000) : "", lessons, projects: Array.isArray(parsed.projects) ? parsed.projects.slice(0, 20) : [], checkpoints: Array.isArray(parsed.checkpoints) ? parsed.checkpoints.slice(0, 30) : [], assessments: Array.isArray(parsed.assessments) ? parsed.assessments.slice(0, 30) : [] };
  const moderationIssues = moderateDraft(normalized);

  try { await supabase.from("generated_course_drafts").insert({ user_id: user.id, draft: normalized, moderation_issues: moderationIssues }).select("id"); }
  catch (e) { console.error("[generateCourse] failed to persist draft to DB:", e instanceof Error ? e.message : e); }
  try { await supabase.from("user_profiles").update({ last_course_generated_at: new Date().toISOString() }).eq("user_id", user.id); } catch {}
  return { ...normalized, moderationIssues };
}

export async function generateCourseForUser(userToken: string, params: { topic: string; goal: string; level?: string }) {
  const draft = await generateCourseDraft(userToken, params);
  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(userToken);
  if (error || !user) throw new Error("Unauthorized");
  const subjName = params.topic.trim().slice(0, 60) || "Generated Course";
  const existing = await supabase.from("subjects").select("id").eq("user_id", user.id).eq("name", subjName).maybeSingle();
  let subjectId = existing.data?.id ?? null;
  if (!subjectId) { const ins = await supabase.from("subjects").insert({ user_id: user.id, name: subjName }).select("id").single(); subjectId = ins.data?.id ?? null; }
  if (!subjectId) throw new Error("Failed to resolve subject");
  const lessonsToInsert = draft.lessons.map((l: any) => ({ user_id: user.id, subject_id: subjectId, topic: (l.topic ?? params.topic ?? l.title ?? "").toString().slice(0, 500), title: l.title, description: l.summary, difficulty: l.difficulty, blocks: l.blocks, progress: 0 }));
  const inserted = await supabase.from("learn_lessons").insert(lessonsToInsert).select("id, title");
  if (inserted.error) throw new Error(`Failed to save generated lessons: ${inserted.error.message}`);
  const titleToId = new Map<string, string>();
  (inserted.data ?? []).forEach((r: any) => titleToId.set(r.title, r.id));
  const prereqInserts: any[] = [];
  for (const l of draft.lessons) {
    const insertedId = titleToId.get(l.title);
    if (!insertedId) continue;
    for (const p of Array.isArray(l.prerequisites) ? l.prerequisites : []) { const pid = titleToId.get(p.toString()); if (pid && pid !== insertedId) prereqInserts.push({ lesson_id: insertedId, prerequisite_lesson_id: pid }); }
  }
  const seen = new Set<string>();
  const deduped = prereqInserts.filter(r => { const key = `${r.lesson_id}::${r.prerequisite_lesson_id}`; if (seen.has(key)) return false; seen.add(key); return true; });
  if (deduped.length) { const { error: prereqError } = await supabase.from("lesson_prerequisites").insert(deduped); if (prereqError) console.error("Failed inserting prereqs:", prereqError.message); }
  try { await supabase.from("learning_paths").upsert({ user_id: user.id, title: draft.title, description: draft.description, updated_at: new Date().toISOString() }, { onConflict: "user_id" }); } catch {}
  return { title: draft.title, lessonsInserted: inserted.data?.length ?? 0, moderationIssues: draft.moderationIssues };
}
