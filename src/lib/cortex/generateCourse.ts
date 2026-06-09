import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function callAI(prompt: string, maxTokens = 2500): Promise<string | null> {
  // Minimal AI caller reusing available providers
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: maxTokens }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text && text.length > 20) return text;
    } catch (err) { console.error("[AI] OpenAI failed:", err); }
  }
  // Fallback: Cloudflare
  if (process.env.CLOUDFLARE_API_TOKEN) {
    try {
      const sup = CF_ACCOUNT;
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${sup}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: maxTokens }),
      });
      const data = await res.json();
      const text = typeof data?.result?.response === "string" ? data.result.response : JSON.stringify(data?.result?.response ?? "");
      if (text && text.length > 20) return text;
    } catch (err) { console.error("[AI] Cloudflare failed:", err); }
  }
  return null;
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

  const prompt = `You are an expert curriculum designer. Produce a compact JSON course for topic: "${topic}", goal: "${goal}", level: "${level}". Return an object with title, description, lessons (array with title, summary, difficulty, estimatedMinutes, blocks, prerequisites), projects, checkpoints, assessments.`;

  const raw = await callAI(prompt, 4000);
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

  return { title: parsed.title ?? topic, description: parsed.description ?? '', lessons: parsed.lessons, projects: parsed.projects ?? [], checkpoints: parsed.checkpoints ?? [], assessments: parsed.assessments ?? [] };
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
  if (prereqInserts.length > 0) {
    await supabase.from('lesson_prerequisites').insert(prereqInserts);
  }

  // Optionally create learning_path entry
  try {
    await supabase.from('learning_paths').upsert({ user_id: user.id, title: draft.title ?? subjName, description: draft.description ?? '', updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  } catch {}

  return { title: draft.title ?? subjName, lessonsInserted: (inserted.data ?? []).length };
}

