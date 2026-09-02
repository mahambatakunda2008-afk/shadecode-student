import { NextResponse } from "next/server";
import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { callAI } from "@/lib/ai";
import { awardXPBySource } from "@/lib/xp/manager";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

type LessonBlock = { type: string; content: string };
type GeneratedLesson = { title: string; subject: string; topic: string; summary: string; blocks: LessonBlock[] };

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function token(req: Request) {
  const value = req.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() || null : null;
}

function objectFrom(raw: string): string | null {
  const text = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, string = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (string) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') string = false;
      continue;
    }
    if (ch === '"') string = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

function parse(raw: string): GeneratedLesson | null {
  const candidate = objectFrom(raw);
  if (!candidate) return null;
  try {
    const value = JSON.parse(candidate) as Partial<GeneratedLesson>;
    if (typeof value.title !== "string" || typeof value.subject !== "string" || typeof value.topic !== "string") return null;
    if (!Array.isArray(value.blocks) || value.blocks.length < 5) return null;
    const blocks = value.blocks.filter((b): b is LessonBlock => !!b && typeof b === "object" && typeof b.type === "string" && typeof b.content === "string" && b.content.trim().length > 0).slice(0, 24);
    if (blocks.length < 5) return null;
    return {
      title: value.title.trim().slice(0, 255),
      subject: value.subject.trim().slice(0, 100),
      topic: value.topic.trim().slice(0, 500),
      summary: typeof value.summary === "string" ? value.summary.trim().slice(0, 1000) : "",
      blocks,
    };
  } catch {
    return null;
  }
}

function buildPrompt(userPrompt: string, subjects: string[], level: number, profile: { xp: number; streak: number }) {
  return `You are Cortex, the teaching engine inside Shadecode Student. The student gave this request verbatim:\n\n"${userPrompt.slice(0, 4000)}"\n\nKnown student context:\n- Education/progression level: ${level}\n- XP: ${profile.xp}\n- Current streak: ${profile.streak}\n- Existing subjects: ${subjects.length ? subjects.join(", ") : "none recorded"}\n\nInterpret the WHOLE request. Do not truncate it to the first character, first word, or a guessed topic. Resolve the most likely subject and specific learning topic from the request and context. If the student says something like “Physics lesson on deformation of solids”, the topic MUST be “deformation of solids”, not “P”, “Physics”, or “Physics lesson”. Preserve useful constraints such as exam urgency, time available, requested teaching style, and whether they want practice/testing after teaching.\n\nCreate a genuinely useful lesson. Teach the concept, connect ideas, show reasoning, expose common mistakes, and make the student do something. Do not invent a curriculum code or syllabus alignment.\n\nReturn ONLY one valid JSON object with this exact shape:\n{"title":"...","subject":"...","topic":"...","summary":"...","blocks":[{"type":"text|example|math|tip|checkpoint|practice|answer|recap","content":"..."}]}\n\nRequirements:\n1. At least 8 blocks.\n2. Include: explanation, mechanism/intuition, worked example with reasoning, math/formula where relevant, common misconception or trap, checkpoint question, independent practice, answer/feedback guidance, recap.\n3. Make every block substantive, not filler.\n4. Keep the lesson appropriate to the student's level.\n5. If the request specifies a time limit, design the lesson to fit it.\n6. If the request asks to be tested after teaching, include practice/checkpoint material and answer guidance.\n7. Never output a placeholder topic or a one-character topic.\n8. JSON only. No markdown fences.`;
}

export async function POST(req: Request) {
  const limited = await applyRateLimit(req, aiEndpointLimiter);
  if (limited) return limited;
  try {
    const bearer = token(req);
    if (!bearer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = admin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(bearer);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (prompt.length < 3) return NextResponse.json({ error: "Tell Cortex what you want to learn." }, { status: 400 });
    if (prompt.length > 4000) return NextResponse.json({ error: "That request is too long. Keep it under 4,000 characters." }, { status: 400 });

    const [{ data: profileData }, { data: subjectData }] = await Promise.all([
      supabase.from("profiles").select("xp, streak, level").eq("id", user.id).maybeSingle(),
      supabase.from("subjects").select("id, name").eq("user_id", user.id).order("name", { ascending: true }),
    ]);
    const subjects = (subjectData ?? []) as Array<{ id: string; name: string }>;
    const profile = { xp: Number(profileData?.xp ?? 0), streak: Number(profileData?.streak ?? 0) };
    const level = Number(profileData?.level ?? 1);

    const generationPrompt = buildPrompt(prompt, subjects.map(s => s.name), level, profile);
    let raw = await callAI(generationPrompt, 5000, { userId: user.id, feature: "lesson_assistant", subfeature: "prompt_first" });
    let lesson = raw ? parse(raw) : null;

    if (!lesson) {
      const repairPrompt = `${generationPrompt}\n\nThe previous response was invalid. Regenerate it from scratch. The student's complete request is:\n"${prompt.slice(0, 4000)}"`;
      raw = await callAI(repairPrompt, 5000, { userId: user.id, feature: "lesson_assistant", subfeature: "prompt_first_repair" });
      lesson = raw ? parse(raw) : null;
    }
    if (!lesson) return NextResponse.json({ error: "Cortex could not produce a complete lesson. Please try the request again." }, { status: 502 });

    const normalizedSubject = lesson.subject.toLowerCase();
    let subjectId = subjects.find(s => s.name.toLowerCase() === normalizedSubject)?.id ?? null;
    if (!subjectId) {
      const fuzzy = subjects.find(s => normalizedSubject.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(normalizedSubject));
      subjectId = fuzzy?.id ?? null;
    }
    if (!subjectId) {
      const { data: created, error: subjectError } = await supabase.from("subjects").insert({ user_id: user.id, name: lesson.subject }).select("id").single();
      if (subjectError || !created?.id) return NextResponse.json({ error: "Cortex created the lesson but could not resolve its subject." }, { status: 500 });
      subjectId = created.id;
    }

    const { data: inserted, error: insertError } = await supabase.from("learn_lessons").insert({
      user_id: user.id,
      subject_id: subjectId,
      title: lesson.title,
      description: lesson.summary || `A focused lesson on ${lesson.topic}.`,
      difficulty: "medium",
      blocks: lesson.blocks,
      progress: 0,
    }).select("id").single();
    if (insertError || !inserted?.id) return NextResponse.json({ error: "The lesson was generated but could not be saved." }, { status: 500 });

    try { await awardXPBySource(user.id, "lesson_generated", 10); } catch {}
    return NextResponse.json({ id: inserted.id, title: lesson.title, subject: lesson.subject, topic: lesson.topic });
  } catch (error) {
    console.error("Prompt-first lesson generation failed:", error);
    return NextResponse.json({ error: "Something went wrong while generating your lesson." }, { status: 500 });
  }
}
