import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { callAI } from "@/lib/ai";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

type Auth = { supabase: SupabaseClient; user: User };
type Block = { id: string; type: string; title?: string; content: string; sourcePages?: number[]; interaction?: { prompt?: string; expectedConcepts?: string[]; evaluationMode?: string; rubric?: string; modelAnswer?: string } };
type Plan = { subject?: string; level?: string; board?: string; blocks?: Block[] };
type Verdict = "correct" | "partially_correct" | "incorrect";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
async function authenticate(req: Request): Promise<Auth | null> {
  const client = admin();
  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    const { data: { user } } = await client.auth.getUser(bearer.slice(7).trim());
    if (user) return { supabase: client, user };
  }
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    const store = await cookies();
    const browser = createServerClient(url, anon, { cookies: {
      getAll: () => store.getAll(),
      setAll: values => { try { values.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {} },
    }});
    const { data: { user } } = await browser.auth.getUser();
    return user ? { supabase: client, user } : null;
  } catch { return null; }
}
function object(raw: string) {
  const text = raw.replace(/^\s*\`\`\`(?:json)?\s*/i, "").replace(/\s*\`\`\`\s*$/i, "").trim();
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) { if (escaped) escaped = false; else if (ch === "\\") escaped = true; else if (ch === '"') quoted = false; continue; }
    if (ch === '"') quoted = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}
function clean(value: string) { return value.replace(/\s+/g, " ").trim().slice(0, 160); }
function blockFor(plan: Plan, id: string) { return (plan.blocks ?? []).find(block => block.id === id && (block.type === "checkpoint" || block.type === "mastery")); }

async function signal(auth: Auth, plan: Plan, block: Block, verdict: Verdict) {
  const subject = clean(plan.subject || "Paper Study") || "Paper Study";
  const concepts = [...new Set((block.interaction?.expectedConcepts ?? []).map(clean).filter(Boolean))].slice(0, 6);
  const score = verdict === "correct" ? 1 : verdict === "partially_correct" ? 0.55 : 0;
  const now = new Date().toISOString();
  for (const topic of concepts) {
    const { data: existing } = await auth.supabase.from("topic_mastery").select("mastery_score,last_score,attempts,trend,retention,confidence,stability,exposure,error_rate,response_speed,prerequisite_health,recent_improvement,uncertainty").eq("user_id", auth.user.id).eq("subject", subject).eq("topic", topic).maybeSingle();
    const previous = Number(existing?.mastery_score ?? 0.5);
    const next = Math.max(0, Math.min(1, previous * 0.65 + score * 0.35));
    const trend = Math.max(-1, Math.min(1, score - previous));
    const confidence = Math.max(0, Math.min(1, Number(existing?.confidence ?? 0.4) * 0.7 + score * 0.3));
    await auth.supabase.from("topic_mastery").upsert({ user_id: auth.user.id, subject, topic, mastery_score: next, last_score: score, attempts: Number(existing?.attempts ?? 0) + 1, last_attempted: now, trend, retention: Number(existing?.retention ?? 0.5), confidence, stability: Number(existing?.stability ?? 0.5), exposure: Number(existing?.exposure ?? 0) + 1, error_rate: Math.max(0, Math.min(1, Number(existing?.error_rate ?? 0.5) * 0.7 + (verdict === "correct" ? 0 : 1) * 0.3)), response_speed: Number(existing?.response_speed ?? 0), prerequisite_health: Number(existing?.prerequisite_health ?? 0.5), recent_improvement: trend, uncertainty: 1 - confidence }, { onConflict: "user_id,subject,topic" });
    await auth.supabase.from("revision_queue").upsert({ user_id: auth.user.id, topic, subject, priority: verdict === "incorrect" ? 9 : verdict === "partially_correct" ? 6 : next < 0.65 ? 4 : 1, source: "paper_learning", last_seen: now }, { onConflict: "user_id,topic,subject" });
  }
  await auth.supabase.from("learning_events").insert({ user_id: auth.user.id, type: "paper_transfer", subject, topic: concepts[0] || clean(block.title || "paper transfer"), score, metadata: { source: "paper_learning", blockId: block.id, verdict, concepts, level: plan.level || null, board: plan.board || null } });
}

export async function POST(req: Request, context: { params: Promise<{ sessionId: string }> }) {
  try {
    const limited = await applyRateLimit(req, aiEndpointLimiter);
    if (limited) return limited;
    const auth = await authenticate(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { sessionId } = await context.params;
    const body = await req.json().catch(() => ({})) as { action?: unknown; blockId?: unknown; transferId?: unknown; response?: unknown };
    const action = body.action === "generate" || body.action === "submit" ? body.action : null;
    const blockId = typeof body.blockId === "string" ? body.blockId.trim().slice(0, 80) : "";
    const transferId = typeof body.transferId === "string" ? body.transferId.trim().slice(0, 80) : "";
    const responseText = typeof body.response === "string" ? body.response.trim().slice(0, 6000) : "";
    if (!action || !blockId) return NextResponse.json({ error: "Transfer action and source checkpoint are required." }, { status: 400 });
    const { data: session } = await auth.supabase.from("paper_learning_sessions").select("id,selected_page_start,selected_page_end,pages,learning_plan").eq("id", sessionId).eq("user_id", auth.user.id).maybeSingle();
    if (!session) return NextResponse.json({ error: "Learning session not found." }, { status: 404 });
    const plan = session.learning_plan as Plan;
    const block = blockFor(plan, blockId);
    if (!block?.interaction?.prompt) return NextResponse.json({ error: "Checkpoint not found." }, { status: 404 });
    const pages = (session.pages as Array<{ pageNumber: number; text: string }>).filter(page => (block.sourcePages ?? []).includes(page.pageNumber));
    const source = pages.length ? pages.map(page => "PAGE " + page.pageNumber + "\n" + page.text.slice(0, 9000)).join("\n\n") : "Selected paper pages " + session.selected_page_start + "-" + session.selected_page_end + ".";
    if (action === "generate") {
      const prompt = "You are Cortex inside Shadecode Student. Create ONE transfer question from the checkpoint below. It must test the same concepts but use meaningfully different values or context. It must be answerable without inventing source facts. Do not repeat the source question. Return ONLY JSON with question, answer, rubric, expectedConcepts.\n\nCHECKPOINT\n" + block.interaction.prompt + "\n\nCONCEPTS\n" + (block.interaction.expectedConcepts ?? []).join(", ") + "\n\nSOURCE\n" + source;
      const raw = await callAI(prompt, 2600, { userId: auth.user.id, feature: "paper_learning", subfeature: "transfer_generation", maxChainMs: 24000, perProviderMaxMs: 8000, skipCurriculumGrounding: true });
      const candidate = raw ? object(raw) : null;
      if (!candidate) return NextResponse.json({ error: "Cortex could not create a reliable transfer question." }, { status: 422 });
      try {
        const parsed = JSON.parse(candidate) as Record<string, unknown>;
        const question = typeof parsed.question === "string" ? parsed.question.trim().slice(0, 2200) : "";
        const answer = typeof parsed.answer === "string" ? parsed.answer.trim().slice(0, 2200) : "";
        const rubric = typeof parsed.rubric === "string" ? parsed.rubric.trim().slice(0, 2200) : "";
        const concepts = Array.isArray(parsed.expectedConcepts) ? parsed.expectedConcepts.filter((v): v is string => typeof v === "string").map(clean).filter(Boolean).slice(0, 8) : [];
        if (!question || !answer || !rubric || concepts.length === 0) return NextResponse.json({ error: "Cortex returned an incomplete transfer question." }, { status: 422 });
        const { data: transfer, error } = await auth.supabase.from("paper_learning_transfer_questions").insert({ session_id: sessionId, user_id: auth.user.id, source_block_id: blockId, question, expected_answer: answer, rubric, expected_concepts: concepts }).select("id,question").single();
        if (error || !transfer) return NextResponse.json({ error: "The transfer question could not be saved." }, { status: 500 });
        return NextResponse.json({ action: "generate", transferId: transfer.id, question: transfer.question, message: "Now apply the idea in a new situation. This is the part that tests whether the learning transfers." });
      } catch { return NextResponse.json({ error: "Cortex returned invalid transfer data." }, { status: 422 }); }
    }
    if (!transferId || !responseText) return NextResponse.json({ error: "Transfer question and answer are required." }, { status: 400 });
    const { data: transfer } = await auth.supabase.from("paper_learning_transfer_questions").select("id,question,expected_answer,rubric,expected_concepts,status,verdict,feedback,misconception,next_action").eq("id", transferId).eq("session_id", sessionId).eq("user_id", auth.user.id).maybeSingle();
    if (!transfer) return NextResponse.json({ error: "Transfer question not found." }, { status: 404 });
    if (transfer.status === "graded") return NextResponse.json({ action: "submit", transferId, verdict: transfer.verdict, feedback: transfer.feedback, misconception: transfer.misconception, nextAction: transfer.next_action, completed: transfer.verdict === "correct", idempotent: true });
    const concepts = Array.isArray(transfer.expected_concepts) ? transfer.expected_concepts.filter((v): v is string => typeof v === "string") : [];
    const prompt = "You are Cortex grading a transfer question after paper study. Grade ONLY against the transfer question, rubric, expected concepts and source context. Return ONLY JSON: verdict correct|partially_correct|incorrect, feedback, misconception, nextAction, hint, solution.\n\nQUESTION\n" + transfer.question + "\n\nEXPECTED CONCEPTS\n" + concepts.join(", ") + "\n\nRUBRIC\n" + transfer.rubric + "\n\nREFERENCE ANSWER\n" + transfer.expected_answer + "\n\nSTUDENT\n" + responseText;
    const raw = await callAI(prompt, 2800, { userId: auth.user.id, feature: "paper_learning", subfeature: "transfer_evaluation", maxChainMs: 28000, perProviderMaxMs: 9000, skipCurriculumGrounding: true });
    const candidate = raw ? object(raw) : null;
    if (!candidate) return NextResponse.json({ error: "Cortex could not reliably grade the transfer attempt." }, { status: 422 });
    let evaluation: { verdict: Verdict; feedback: string; misconception: string; nextAction: string } | null = null;
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      if (parsed.verdict !== "correct" && parsed.verdict !== "partially_correct" && parsed.verdict !== "incorrect") throw new Error();
      evaluation = { verdict: parsed.verdict as Verdict, feedback: typeof parsed.feedback === "string" ? parsed.feedback.slice(0,1800) : "", misconception: typeof parsed.misconception === "string" ? parsed.misconception.slice(0,900) : "", nextAction: typeof parsed.nextAction === "string" ? parsed.nextAction.slice(0,700) : "" };
    } catch { return NextResponse.json({ error: "Cortex returned invalid grading data." }, { status: 422 }); }
    const { data: previousAttempts } = await auth.supabase.from("paper_learning_attempts").select("attempt_no").eq("session_id", sessionId).eq("user_id", auth.user.id).eq("block_id", blockId).eq("action", "transfer-submit").order("attempt_no", { ascending: false }).limit(1);
    const attemptNo = Number(previousAttempts?.[0]?.attempt_no ?? 0) + 1;
    const { data: claimed } = await auth.supabase.from("paper_learning_transfer_questions").update({ status: "graded", response: responseText, verdict: evaluation.verdict, feedback: evaluation.feedback, misconception: evaluation.misconception || null, next_action: evaluation.nextAction || null, graded_at: new Date().toISOString() }).eq("id", transferId).eq("user_id", auth.user.id).eq("status", "pending").select("id").maybeSingle();
    if (!claimed) {
      const { data: finalTransfer } = await auth.supabase.from("paper_learning_transfer_questions").select("verdict,feedback,misconception,next_action").eq("id", transferId).eq("user_id", auth.user.id).maybeSingle();
      if (!finalTransfer) return NextResponse.json({ error: "Transfer result could not be recovered after the grading race." }, { status: 409 });
      return NextResponse.json({ action: "submit", transferId, verdict: finalTransfer.verdict, feedback: finalTransfer.feedback, misconception: finalTransfer.misconception, nextAction: finalTransfer.next_action, completed: finalTransfer.verdict === "correct", idempotent: true });
    }
    const transferBlock: Block = { id: "transfer:" + transfer.id, type: "mastery", title: "Transfer question", content: transfer.question, sourcePages: block.sourcePages, interaction: { prompt: transfer.question, expectedConcepts: concepts, evaluationMode: "mixed", rubric: transfer.rubric, modelAnswer: transfer.expected_answer } };
    await auth.supabase.from("paper_learning_attempts").insert({ session_id: sessionId, user_id: auth.user.id, block_id: blockId, attempt_no: attemptNo, action: "transfer-submit", response: responseText, verdict: evaluation.verdict, feedback: evaluation.feedback || null, misconception: evaluation.misconception || null, next_action: evaluation.nextAction || null });
    try { await signal(auth, plan, transferBlock, evaluation.verdict); } catch (error) { console.error("[paper-learning] transfer signal failed", error); }
    return NextResponse.json({ action: "submit", transferId, verdict: evaluation.verdict, feedback: evaluation.feedback, misconception: evaluation.misconception || null, nextAction: evaluation.nextAction || null, completed: evaluation.verdict === "correct" });
  } catch (error) {
    console.error("[paper-learning] transfer route failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Transfer processing failed." }, { status: 500 });
  }
}
