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
type Plan = { title?: string; overview?: string; subject?: string; level?: string; board?: string; topics?: string[]; blocks?: Block[] };
type EvaluationVerdict = "correct" | "partially_correct" | "incorrect";
type Evaluation = {
  verdict: EvaluationVerdict;
  feedback: string;
  misconception: string;
  nextAction: string;
  hint: string;
  solution: string;
};

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

function parseEvaluation(raw: string): Evaluation | null {
  const candidate = extractObject(raw);
  if (!candidate) return null;
  try {
    const value = JSON.parse(candidate) as Record<string, unknown>;
    const verdict = value.verdict;
    if (verdict !== "correct" && verdict !== "partially_correct" && verdict !== "incorrect") return null;
    const text = (key: string, max: number) => typeof value[key] === "string" ? value[key].trim().slice(0, max) : "";
    return {
      verdict: verdict as EvaluationVerdict,
      feedback: text("feedback", 1800),
      misconception: text("misconception", 900),
      nextAction: text("nextAction", 700),
      hint: text("hint", 1000),
      solution: text("solution", 2200),
    };
  } catch { return null; }
}

function findBlock(plan: Plan, blockId: string) {
  return (plan.blocks ?? []).find(block => block.id === blockId && (block.type === "checkpoint" || block.type === "mastery"));
}

function cleanTopic(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

async function recordLearningSignal(auth: AuthContext, plan: Plan, block: Block, verdict: EvaluationVerdict, attemptNo: number) {
  const subject = cleanTopic(plan.subject || "Paper Study") || "Paper Study";
  const topics = [...new Set((block.interaction?.expectedConcepts ?? []).map(cleanTopic).filter(Boolean))].slice(0, 6);
  const score = verdict === "correct" ? 1 : verdict === "partially_correct" ? 0.55 : 0;
  const now = new Date().toISOString();

  for (const topic of topics) {
    const { data: existing } = await auth.supabase
      .from("topic_mastery")
      .select("mastery_score,last_score,attempts,trend,retention,confidence,stability,exposure,error_rate,response_speed,prerequisite_health,recent_improvement,uncertainty")
      .eq("user_id", auth.user.id)
      .eq("subject", subject)
      .eq("topic", topic)
      .maybeSingle();

    const previous = Number(existing?.mastery_score ?? 0.5);
    const nextMastery = Math.max(0, Math.min(1, previous * 0.65 + score * 0.35));
    const previousAttempts = Number(existing?.attempts ?? 0);
    const attempts = previousAttempts + 1;
    const previousError = Number(existing?.error_rate ?? 0.5);
    const errorRate = Math.max(0, Math.min(1, previousError * 0.7 + (verdict === "correct" ? 0 : 1) * 0.3));
    const confidence = Math.max(0, Math.min(1, Number(existing?.confidence ?? 0.4) * 0.7 + score * 0.3));
    const trend = Math.max(-1, Math.min(1, score - previous));
    const uncertainty = Math.max(0, Math.min(1, 1 - confidence));

    await auth.supabase.from("topic_mastery").upsert({
      user_id: auth.user.id,
      subject,
      topic,
      mastery_score: nextMastery,
      last_score: score,
      attempts,
      last_attempted: now,
      trend,
      retention: Number(existing?.retention ?? 0.5),
      confidence,
      stability: Number(existing?.stability ?? 0.5),
      exposure: Number(existing?.exposure ?? 0) + 1,
      error_rate: errorRate,
      response_speed: Number(existing?.response_speed ?? 0),
      prerequisite_health: Number(existing?.prerequisite_health ?? 0.5),
      recent_improvement: trend,
      uncertainty,
    }, { onConflict: "user_id,subject,topic" });

    const priority = verdict === "incorrect" ? 9 : verdict === "partially_correct" ? 6 : nextMastery < 0.65 ? 4 : 1;
    await auth.supabase.from("revision_queue").upsert({
      user_id: auth.user.id,
      topic,
      subject,
      priority,
      source: "paper_learning",
      last_seen: now,
    }, { onConflict: "user_id,topic,subject" });
  }

  await auth.supabase.from("learning_events").insert({
    user_id: auth.user.id,
    type: "paper_checkpoint",
    subject,
    topic: topics[0] || cleanTopic(block.title || "paper checkpoint") || "Paper checkpoint",
    score,
    metadata: {
      source: "paper_learning",
      blockId: block.id,
      attemptNo,
      verdict,
      concepts: topics,
      level: plan.level || null,
      board: plan.board || null,
    },
  });
}

export async function POST(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const limited = await applyRateLimit(req, aiEndpointLimiter);
    if (limited) return limited;
    const auth = await authenticate(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId } = await context.params;
    const body = await req.json().catch(() => ({})) as { blockId?: unknown; action?: unknown; response?: unknown; clientActionId?: unknown };
    const blockId = typeof body.blockId === "string" ? body.blockId.trim().slice(0, 80) : "";
    const action = body.action === "hint" || body.action === "reveal" || body.action === "teach-page" || body.action === "explain-step" || body.action === "why" || body.action === "quiz" ? body.action : "submit";
    const responseText = typeof body.response === "string" ? body.response.trim().slice(0, 6000) : "";
    const clientActionId = typeof body.clientActionId === "string" ? body.clientActionId.trim().slice(0, 120) : "";
    if (!blockId) return NextResponse.json({ error: "Checkpoint is missing." }, { status: 400 });
    if (action === "submit" && !responseText) return NextResponse.json({ error: "Write an attempt before submitting." }, { status: 400 });
    if (action === "submit" && !clientActionId) return NextResponse.json({ error: "Submission identity is missing. Please try again." }, { status: 400 });

    const { data: session, error: sessionError } = await auth.supabase
      .from("paper_learning_sessions")
      .select("id,source_name,selected_page_start,selected_page_end,pages,learning_plan,progress")
      .eq("id", sessionId)
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (sessionError) return NextResponse.json({ error: "Couldn't load this learning session." }, { status: 500 });
    if (!session) return NextResponse.json({ error: "Learning session not found." }, { status: 404 });

    if (action === "submit" && clientActionId) {
      const { data: existingAction } = await auth.supabase
        .from("paper_learning_attempts")
        .select("attempt_no,verdict,feedback,misconception,next_action")
        .eq("session_id", sessionId)
        .eq("user_id", auth.user.id)
        .eq("client_action_id", clientActionId)
        .maybeSingle();
      if (existingAction) {
        return NextResponse.json({
          action: "submit",
          verdict: existingAction.verdict,
          feedback: existingAction.feedback || "",
          misconception: existingAction.misconception || null,
          nextAction: existingAction.next_action || null,
          hint: null,
          solution: existingAction.verdict === "correct" ? undefined : null,
          attemptCount: existingAction.attempt_no,
          completed: existingAction.verdict === "correct",
          replayed: true,
        });
      }
    }

    const plan = session.learning_plan as Plan;
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

    if (action === "teach-page" || action === "explain-step" || action === "why" || action === "quiz") {
      const source = sourcePages.length
        ? sourcePages.map(page => `PAGE ${page.pageNumber}\n${page.text.slice(0, 9000)}`).join("\n\n")
        : `Selected paper pages ${session.selected_page_start}-${session.selected_page_end}.`;
      const actionInstruction = action === "teach-page"
        ? "Teach the selected source page(s) as a short, grounded explanation. Start with what the page is testing, then prerequisites, then the method and why it works. Do not solve a question unless needed to explain the method."
        : action === "explain-step"
          ? "Explain the next useful reasoning step for the checkpoint. Do not dump the full solution. Explain why that step is justified."
          : action === "why"
            ? "Explain why the key method or step in this checkpoint works. Connect the reasoning to the underlying concept, not just a rule."
            : "Create one NEW short mastery question testing the same concept as this checkpoint, but with different values or context. Include the question, what skill it tests, and a compact answer hidden from the student UI contract.";
      const actionPrompt = `You are Cortex inside Shadecode Student. Respond only from the supplied checkpoint and source pages. Never invent source facts. Student action: ${action}.\n\nCHECKPOINT\n${block.interaction.prompt}\n\nCONTEXT\n${block.content}\n\nEXPECTED CONCEPTS\n${(block.interaction.expectedConcepts ?? []).join(", ") || "not specified"}\n\nSOURCE\n${source}\n\nINSTRUCTION\n${actionInstruction}\n\nReturn JSON: {"message":"student-facing response","question":"only for quiz, otherwise empty","answer":"only for quiz, keep concise"}`;
      const raw = await callAI(actionPrompt, 2200, { userId: auth.user.id, feature: "paper_learning", subfeature: `interaction_${action}`, maxChainMs: 18000, perProviderMaxMs: 7000, skipCurriculumGrounding: true });
      const candidate = raw ? extractObject(raw) : null;
      if (!candidate) return NextResponse.json({ error: "Cortex couldn't reliably answer that action. Try again." }, { status: 422 });
      try {
        const parsed = JSON.parse(candidate) as Record<string, unknown>;
        const message = typeof parsed.message === "string" ? parsed.message.trim().slice(0, 3500) : "";
        const question = typeof parsed.question === "string" ? parsed.question.trim().slice(0, 1600) : "";
        const answer = typeof parsed.answer === "string" ? parsed.answer.trim().slice(0, 1600) : "";
        if (!message && action !== "quiz") return NextResponse.json({ error: "Cortex returned an incomplete response." }, { status: 422 });
        return NextResponse.json({ action, message, question: action === "quiz" ? question : "", answer: "" });
      } catch {
        return NextResponse.json({ error: "Cortex returned an invalid interaction response." }, { status: 422 });
      }
    }


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
    const { error: attemptError } = await auth.supabase.from("paper_learning_attempts").insert({
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
      client_action_id: clientActionId || null,
    });
    if (attemptError) {
      const { data: savedAction } = clientActionId
        ? await auth.supabase.from("paper_learning_attempts").select("attempt_no,verdict,feedback,misconception,next_action").eq("session_id", sessionId).eq("user_id", auth.user.id).eq("client_action_id", clientActionId).maybeSingle()
        : { data: null };
      if (savedAction) return NextResponse.json({ action: "submit", verdict: savedAction.verdict, feedback: savedAction.feedback || "", misconception: savedAction.misconception || null, nextAction: savedAction.next_action || null, hint: null, solution: savedAction.verdict === "correct" ? undefined : null, attemptCount: savedAction.attempt_no, completed: savedAction.verdict === "correct", replayed: true });
      return NextResponse.json({ error: "The attempt could not be saved, so mastery was not changed." }, { status: 500 });
    }

    const progress = (session.progress && typeof session.progress === "object" ? session.progress : {}) as Record<string, unknown>;
    const completed = Array.isArray(progress.completedBlockIds) ? progress.completedBlockIds.filter((id): id is string => typeof id === "string") : [];
    const nextCompleted = evaluation.verdict === "correct" && !completed.includes(blockId) ? [...completed, blockId] : completed;
    const nextProgress = { ...progress, completedBlockIds: nextCompleted, lastBlockId: blockId, lastVerdict: evaluation.verdict, updatedAt: new Date().toISOString() };
    await auth.supabase.from("paper_learning_sessions").update({ progress: nextProgress }).eq("id", sessionId).eq("user_id", auth.user.id);

    try {
      await recordLearningSignal(auth, plan, block, evaluation.verdict, attemptNo);
    } catch (signalError) {
      console.error("[paper-learning] learning signal update failed", signalError);
    }

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
