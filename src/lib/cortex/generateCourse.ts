import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { callAI as sharedCallAI } from "@/lib/ai";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Delegates to the shared provider chain (Cloudflare -> OpenAI -> Gemini -> OpenRouter,
// with real timeouts and usage tracking) instead of maintaining its own partial copy.
export let aiCaller = async function callAI(prompt: string, maxTokens = 2500): Promise<string | null> {
  return sharedCallAI(prompt, maxTokens, { feature: "course_generation", subfeature: "generate_course" });
};

export function setAiCaller(fn: (prompt: string, maxTokens?: number) => Promise<string | null>) {
  aiCaller = fn;
}

function moderateDraft(draft: any) {
  const issues: string[] = [];
  const banned = ["fuck","shit","bitch","idiot","sex"];
  const text = (JSON.stringify(draft) || "").toLowerCase();
  for (const b of banned) if (text.includes(b)) issues.push(`Profanity detected: ${b}`);
  // Links may indicate external content — flag for review
  if (/https?:\/\//.test(text)) issues.push("Contains external links — review for safety");
  // Size checks
  if ((draft.lessons?.length ?? 0) > 40) issues.push("Large number of lessons (>40) — consider reducing");
  // Short content checks
  for (const l of (draft.lessons ?? [])) {
    if ((l.summary ?? "").length < 10) issues.push(`Lesson '${l.title}' summary too short`);
    const blocks = l.blocks ?? [];
    if (blocks.length === 0) issues.push(`Lesson '${l.title}' has no content blocks`);
  }
  return issues;
}


function safeParseJSON(raw: string): any | null {
  let text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  try {
    const fixed = text.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
    const m = fixed.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  try {
    const stripped = text.replace(/\\/g, "");
    const m = stripped.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  return null;
}

export async function generateCourseDraft(userToken: string, params: { topic: string; goal: string; level?: string }) {
  const supabase = getSupabaseAdmin();
  // validate user token
  const { data: { user }, error } = await supabase.auth.getUser(userToken);
  if (error || !user) throw new Error('Unauthorized');

  const topic = params.topic;
  const goal = params.goal;
  const level = params.level ?? 'beginner';

  // Cooldown check: prevent frequent generation (1 hour)
  try {
    const { data: profileData } = await supabase.from('user_profiles').select('last_course_generated_at').eq('user_id', user.id).maybeSingle();
    const last = profileData?.last_course_generated_at;
    if (last) {
      const lastTs = new Date(last).getTime();
      const now = Date.now();
      const elapsed = now - lastTs;
      const hour = 1000 * 60 * 60;
      if (elapsed < hour) {
        const mins = Math.ceil((hour - elapsed) / (1000 * 60));
        throw new Error(`Cooldown: please wait ${mins} minutes before generating another course.`);
      }
    }
  } catch (e) {
    // Ignore DB errors for cooldown check but surface explicit message
    if (e instanceof Error && e.message.startsWith('Cooldown')) throw e;
  }

  const prompt = `You are an expert curriculum designer. Produce a compact JSON course for topic: "${topic}", goal: "${goal}", level: "${level}". Return an object with title, description, lessons (array with title, summary, difficulty, estimatedMinutes, blocks, prerequisites), projects, checkpoints, assessments.`;

  const raw = await aiCaller(prompt, 4000);
  if (!raw) throw new Error('AI unavailable');
  const parsed = safeParseJSON(raw);
  if (!parsed || !Array.isArray(parsed.lessons) || parsed.lessons.length === 0) throw new Error('Invalid course structure');

  // Normalize lessons minimally for preview
  parsed.lessons = parsed.lessons.slice(0, 50).map((l: any) => ({
    title: (l.title ?? l.summary ?? 'Untitled').toString().slice(0,255),
    summary: (l.summary ?? '').toString().slice(0,1000),
    difficulty: (l.difficulty === 'hard' ? 'hard' : l.difficulty === 'medium' ? 'medium' : 'easy'),
    estimatedMinutes: typeof l.estimatedMinutes === 'number' ? l.estimatedMinutes : 30,
    blocks: Array.isArray(l.blocks) ? l.blocks : [{ type: 'text', content: l.summary ?? '' }],
    prerequisites: Array.isArray(l.prerequisites) ? l.prerequisites.map((p: any) => p.toString().slice(0,255)) : [],
  }));

  // Moderation: lightweight checks
  const moderationIssues = moderateDraft({ title: parsed.title, description: parsed.description, lessons: parsed.lessons });

  // Persist draft into generated_course_drafts (if table exists)
  try {
    await supabase.from('generated_course_drafts').insert({ user_id: user.id, draft: { title: parsed.title ?? topic, description: parsed.description ?? '', lessons: parsed.lessons, projects: parsed.projects ?? [], checkpoints: parsed.checkpoints ?? [], assessments: parsed.assessments ?? [] }, moderation_issues: moderationIssues }).select('id');
  } catch (e) {
    // ignore if table not present or insert fails
    console.error('[generateCourse] failed to persist draft to DB:', e instanceof Error ? e.message : e);
  }

  // Update last_course_generated_at to enforce cooldown
  try {
    await supabase.from('user_profiles').update({ last_course_generated_at: new Date().toISOString() }).eq('user_id', user.id);
  } catch {}

  return { title: parsed.title ?? topic, description: parsed.description ?? '', lessons: parsed.lessons, projects: parsed.projects ?? [], checkpoints: parsed.checkpoints ?? [], assessments: parsed.assessments ?? [], moderationIssues };

}

export async function generateCourseForUser(userToken: string, params: { topic: string; goal: string; level?: string }) {
  // Use draft generator
  const draft = await generateCourseDraft(userToken, params);

  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(userToken);
  if (error || !user) throw new Error('Unauthorized');

  const topic = params.topic;
  const subjName = topic.length > 0 && topic.length <= 60 ? topic : `Course: ${topic}`;
  let subjectId: string | null = null;
  const existing = await supabase.from('subjects').select('id').eq('user_id', user.id).eq('name', subjName).maybeSingle();
  if (existing.data && existing.data.id) subjectId = existing.data.id;
  else {
    const ins = await supabase.from('subjects').insert({ user_id: user.id, name: subjName }).select('id').single();
    subjectId = ins.data?.id ?? null;
  }
  if (!subjectId) throw new Error('Failed to resolve subject');

  const lessonsToInsert = draft.lessons.map((l: any) => ({
    user_id: user.id,
    subject_id: subjectId,
    title: l.title,
    description: l.summary,
    difficulty: l.difficulty,
    blocks: l.blocks,
    progress: 0,
  }));

  const inserted = await supabase.from('learn_lessons').insert(lessonsToInsert).select('id, title');
  const titleToId = new Map<string,string>();
  (inserted.data ?? []).forEach((r: any) => titleToId.set(r.title, r.id));

  const prereqInserts: any[] = [];
  for (const l of draft.lessons) {
    const insertedId = titleToId.get(l.title);
    if (!insertedId) continue;
    const prereqs = Array.isArray(l.prerequisites) ? l.prerequisites : [];
    for (const p of prereqs) {
      const pid = titleToId.get(p.toString());
      if (pid && pid !== insertedId) prereqInserts.push({ lesson_id: insertedId, prerequisite_lesson_id: pid });
    }
  }
  // dedupe
  const seen = new Set<string>();
  const deduped: any[] = [];
  for (const r of prereqInserts) {
    const key = `${r.lesson_id}::${r.prerequisite_lesson_id}`;
    if (!seen.has(key)) { seen.add(key); deduped.push(r); }
  }
  if (deduped.length > 0) {
    try { await supabase.from('lesson_prerequisites').insert(deduped); } catch (e) { console.error('Failed inserting prereqs', e); }
  }

  // Optionally create learning_path entry
  try {
    await supabase.from('learning_paths').upsert({ user_id: user.id, title: draft.title ?? subjName, description: draft.description ?? '', updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  } catch {}

  // Update last_course_generated_at after persistence
  try {
    await supabase.from('user_profiles').update({ last_course_generated_at: new Date().toISOString() }).eq('user_id', user.id);
  } catch {}

  return { title: draft.title ?? subjName, lessonsInserted: (inserted.data ?? []).length, moderationIssues: (draft as any).moderationIssues ?? [] };
}


