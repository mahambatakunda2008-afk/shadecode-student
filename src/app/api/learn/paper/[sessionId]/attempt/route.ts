import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { callAI } from "@/lib/ai";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

type AuthContext = { supabase: SupabaseClient; user: User };
type Interaction = { prompt?: string; evaluationMode?: string; expectedConcepts?: string[]; rubric?: string; modelAnswer?: string; hints?: string[] };
type Block = { id: string; type: string; title?: string; content: string; sourcePages?: number[]; interaction?: Interaction };

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

function extractObject(raw: string) {
  const text = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let string = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (string) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') string = false;
      continue;
    }
    if (ch === '"') string = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

function parseEvaluation(raw: string) {
  const candidate = extractObject(raw);
  if (!candidate) return null;
  try {
    const value = JSON.parse(candidate) as Record<string, unknown>;
    const verdict = value.verdict;
    if (verdict !== "correct" && verdict !== "partially_correct" && verdict !== "incorrect") return null;
    const text = (key: string, max: number) => typeof value[key] === "string" ? value[key].trim().slice(0, max) : "";
    return {
      verdict,
      feedback: text("feedback", 1800),
      misconception: text("misconception", 900),
      nextAction: text("nextAction", 700),
      hint: text("hint", 1000),
      solution: text("solution", 2200),
    };
  } catch { return null; }
}

function findBlock(plan: { blocks?: Block[] }, blockId: string) {
  return (plan.blocks ?? []).find(block => block.id === blockId && (block.type === "checkpoint" || block.type === "mastery"));
}

export async function POST(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const limited = await applyRateLimit(req, aiEndpointLimiter);
    if (limited) return limited;
    const auth = await authenticate(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await context.params;
    const body = await req.json().catch(() => ({})) as { blockId?: unknown; action?: unknown; response?: unknown };
    const blockId = typeof body.blockId === "string" ? body.blockId.trim().slice(0, 80) : "";
    const action = body.action === "hint" || body.action === "reveal" ? body.action : "submit";
    const responseText = typeof body.response === "string" ? body.response.trim().slice(0, 6000) : "";
    if (!blockId) return NextResponse.json({ error: "Checkpoint is missing." }, { status: 400 });
    if (action === "submit" && !responseText) return NextResponse.json({ error: "Write an attempt before submitting." }, { status: 400 });

    const { data: session, error: sessionError } = await auth.supabase
      .from("paper_learning_sessions")
      .select("id,source_name,selected_page_start,selected_page_end,pages,learning_plan,progress")
      .eq("id", sessionId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (sessionError) return NextResponse.json({ error: "Couldn't load this learning session." }, { status: 500 });
    if (!session) return NextResponse.json({ error: "Learning session not found." }, { status: 404 });

    const plan = session.learning_plan as { title?: string; overview?: string; blocks?: Block[] };
    const block = findBlock(plan, blockId);
    if (!block?.interaction?.prompt || !block.interaction.rubric || !block.interaction.modelAnswer) {
      return NextResponse.json({ error: "This checkpoint does not have enough evaluation data yet. Generate a new paper session." }, { status: 422 });
    }

    const { data: previousAttempts } = await auth.supabase
      .from("paper_learning_attempts")
      .select("attempt_no,action,verdict,feedback,misconception,created_at")
      .eq("session_id", sessionId)
      .eq("user_id", auth.user.id)
      .eq("block_id", blockId)
      .order("created_at", { ascending: true });
    const submitCount = (previousAttempts ?? []).filter(item => item.action === "submit").length;

    if (action === "hint") {
      const hints = block.interaction.hints ?? [];
      const index = Math.min(submitCount, Math.max(0, hints.length - 1));
      const hint = hints[index] || "Start by identifying the concept the question is testing, then state the first justified step.";
      await auth.supabase.from("paper_learning_attempts").insert({ session_id: sessionId, user_id: auth.user.id, block_id: blockId, attempt_no: submitCount + 1, action: "hint", response: null, verdict: "not_graded", feedback: hint, misconception: null, next_action: "Try the checkpoint again." });
      return NextResponse.json({ action: "hint", hint, attemptCount: submitCount });
    }

    if (action === "reveal") {
      await auth.supabase.from("paper_learning_attempts").insert({ session_id: sessionId, user_id: auth.user.id, block_id: blockId, attempt_no: submitCount + 1, action: "reveal", response: null, verdict: "not_graded", feedback: "Solution revealed by student.", misconception: null, next_action: "Explain the reasoning in your own words." });
      return NextResponse.json({ action: "reveal", solution: block.interaction.modelAnswer, attemptCount: submitCount });
    }

    const sourcePages = (session.pages as Array<{ pageNumber: number; text: string }>).filter(page => (block.sourcePages ?? []).includes(page.pageNumber));
    const source = sourcePages.length
      ? sourcePages.map(page => `PAGE ${page.pageNumber}\n${page.text.slice(0, 9000)}`).join("\n\n")
      : `Selected paper pages ${session.selected_page_start}-${session.selected_page_end}.`;
    const prompt = `You are Cortex, evaluating a student's attempt inside Shadecode Student. Grade ONLY against the supplied checkpoint and source. Do not reward an answer merely because it sounds plausible. Do not invent missing facts. Be constructive and concise.

CHECKPOINT
${block.interaction.prompt}

CHECKPOINT CONTEXT
${block.content}

EVALUATION MODE
${block.interaction.evaluationMode ?? "mixed"}

EXPECTED CONCEPTS
${(block.interaction.expectedConcepts ?? []).join(", ") || "not specified"}

RUBRIC
${block.interaction.rubric}

REFERENCE SOLUTION
${block.interaction.modelAnswer}

SOURCE
${source}

STUDENT ATTEMPT
${responseText}

Return ONLY JSON with:
{"verdict":"correct|partially_correct|incorrect","feedback":"specific feedback that teaches, not just a score","misconception":"only if a concrete misconception is visible","nextAction":"what the student should do next","hint":"one useful hint without giving away the solution","solution":"only include the complete solution when verdict is correct; otherwise return an empty string"}`;

    const raw = await callAI(prompt, 2800, { userId: auth.user.id, feature: "paper_learning", subfeature: "checkpoint_evaluation", maxChainMs: 28000, perProviderMaxMs: 9000, skipCurriculumGrounding: true });
    const evaluation = raw ? parseEvaluation(raw) : null;
    if (!evaluation) return NextResponse.json({ error: "Cortex couldn't reliably grade that attempt. Your answer was not recorded as correct." }, { status: 422 });

    const attemptNo = submitCount + 1;
    await auth.supabase.from("paper_learning_attempts").insert({
      session_id: sessionId,
      user_id: auth.user.id,
      block_id: blockId,
      attempt_no: attemptNo,
      action: "submit",
      response: responseText,
      verdict: evaluation.verdict,
      feedback: evaluation.feedback,
      misconception: evaluation.misconception || null,
      next_action: evaluation.nextAction || null,
    });

    const progress = (session.progress && typeof session.progress === "object" ? session.progress : {}) as Record<string, unknown>;
    const completed = Array.isArray(progress.completedBlockIds) ? progress.completedBlockIds.filter((id): id is string => typeof id === "string") : [];
    const nextCompleted = evaluation.verdict === "correct" && !completed.includes(blockId) ? [...completed, blockId] : completed;
    const nextProgress = { ...progress, completedBlockIds: nextCompleted, lastBlockId: blockId, lastVerdict: evaluation.verdict, updatedAt: new Date().toISOString() };
    await auth.supabase.from("paper_learning_sessions").update({ progress: nextProgress }).eq("id", sessionId).eq("user_id", auth.user.id);

    return NextResponse.json({
      action: "submit",
      verdict: evaluation.verdict,
      feedback: evaluation.feedback || (evaluation.verdict === "correct" ? "Correct. Now explain why the method works." : "There is a gap in the reasoning. Try again."),
      misconception: evaluation.misconception || null,
      nextAction: evaluation.nextAction || null,
      hint: evaluation.hint || null,
      solution: evaluation.verdict === "correct" ? evaluation.solution || block.interaction.modelAnswer : null,
      attemptCount: attemptNo,
      completed: evaluation.verdict === "correct",
    });
  } catch (error) {
    console.error("[paper-learning] checkpoint evaluation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Something went wrong while checking your attempt." }, { status: 500 });
  }
}
