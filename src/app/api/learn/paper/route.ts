import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { callAI } from "@/lib/ai";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { awardXPBySource } from "@/lib/xp/manager";
import { buildPaperSourceText, extractPdfPages, normalizePageRange, type PaperPage } from "@/lib/learn/paperLearning";
import { extractTopLevelQuestionsFromPages } from "@/lib/exam/question-extraction";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_PAGES = 40;
const DEFAULT_PAGE_END = 8;

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

function parsePlan(raw: string) {
  const candidate = extractObject(raw);
  if (!candidate) return null;
  try {
    const value = JSON.parse(candidate) as { title?: unknown; overview?: unknown; blocks?: unknown };
    if (typeof value.title !== "string" || !value.title.trim() || !Array.isArray(value.blocks)) return null;
    const blocks = value.blocks.filter((block): block is { type: string; title?: string; content: string } => {
      if (!block || typeof block !== "object") return false;
      const item = block as { type?: unknown; title?: unknown; content?: unknown };
      return typeof item.type === "string" && typeof item.content === "string" && item.content.trim().length >= 20;
    }).slice(0, 20);
    if (blocks.length < 4) return null;
    return {
      title: value.title.trim().slice(0, 255),
      overview: typeof value.overview === "string" ? value.overview.trim().slice(0, 2000) : "",
      blocks,
    };
  } catch {
    return null;
  }
}

function paperPrompt(pages: PaperPage[], questions: ReturnType<typeof extractTopLevelQuestionsFromPages>) {
  const source = buildPaperSourceText(pages);
  const questionIndex = questions.length
    ? questions.map(q => `Q${q.questionNumber}: pages ${q.sourcePageStart}-${q.sourcePageEnd}; marks ${q.marks ?? "unknown"}`).join("\n")
    : "No reliable top-level question index was extracted. Do not invent one.";

  return `You are Cortex, the learning engine inside Shadecode Student. Turn the student's actual source pages into a grounded learning session. This is NOT an answer dump and NOT a generic textbook lesson.

SELECTED SOURCE PAGES
${source}

EXTRACTED QUESTION INDEX
${questionIndex}

RULES
1. Stay grounded in the supplied pages. Never invent missing question text, values, diagrams, marks, syllabus claims or provenance.
2. Preserve page and question references whenever discussing a question.
3. First explain what the selected pages cover and what each question is testing.
4. Teach prerequisite concepts before the method when needed.
5. For worked reasoning, explain WHY each step is taken, not merely the algebra.
6. Highlight recognition patterns. For example, identify when a problem is a disguised quadratic, identity proof, factorisation, graph/intersection task, etc., only when the source actually supports that classification.
7. Include checkpoints where the learner must think. Do not reveal the checkpoint answer in the same block.
8. Include common traps only when supported by the actual mathematics/question structure. Do not invent examiner claims.
9. Finish with a short mastery check using NEW questions based on the concepts encountered. Do not simply repeat the source questions.
10. If a page has no selectable text, explicitly say that the page may require visual/OCR inspection. Do not hallucinate its contents.
11. Use concise, scannable student-facing blocks. Every mathematical expression must be wrapped in single-dollar LaTeX delimiters.

Return ONLY JSON:
{"title":"specific learning-session title","overview":"what these pages cover","blocks":[{"type":"source-map|concept|definition|method|example|checkpoint|mistake|pattern|application|mastery|summary","title":"short heading","content":"student-facing explanation"}]}`;
}

export async function GET(req: Request) {
  const auth = await authenticate(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const { data, error } = await auth.supabase.from("paper_learning_sessions").select("id,source_name,mime_type,source_size_bytes,page_count,selected_page_start,selected_page_end,status,source_metadata,pages,learning_plan,created_at,updated_at").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Couldn't load the paper session." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Paper session not found." }, { status: 404 });
    return NextResponse.json(data);
  }
  const { data, error } = await auth.supabase.from("paper_learning_sessions").select("id,source_name,page_count,selected_page_start,selected_page_end,status,learning_plan,created_at,updated_at").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: "Couldn't load paper sessions." }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

export async function POST(req: Request) {
  let auth: AuthContext | null = null;
  try {
    const limited = await applyRateLimit(req, aiEndpointLimiter);
    if (limited) return limited;
    auth = await authenticate(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF first." }, { status: 400 });
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ error: "Only PDF question papers are supported in this first version." }, { status: 415 });
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "PDF must be smaller than 12 MB." }, { status: 413 });

    const pages = await extractPdfPages(file);
    if (!pages.length) return NextResponse.json({ error: "No pages could be extracted from this PDF." }, { status: 422 });
    if (pages.length > MAX_PAGES) return NextResponse.json({ error: `This PDF has ${pages.length} pages. For now, select a paper of ${MAX_PAGES} pages or fewer.` }, { status: 413 });

    const requestedStart = Number(form.get("pageStart") ?? 1);
    const requestedEnd = Number(form.get("pageEnd") ?? DEFAULT_PAGE_END);
    const range = normalizePageRange(Number.isFinite(requestedStart) ? requestedStart : 1, Number.isFinite(requestedEnd) ? requestedEnd : DEFAULT_PAGE_END, pages.length);
    const selectedPages = pages.slice(range.start - 1, range.end);
    const questions = extractTopLevelQuestionsFromPages(selectedPages);

    const { data: session, error: insertError } = await auth.supabase.from("paper_learning_sessions").insert({
      user_id: auth.user.id,
      source_name: file.name.slice(0, 255),
      mime_type: file.type || "application/pdf",
      source_size_bytes: file.size,
      page_count: pages.length,
      selected_page_start: range.start,
      selected_page_end: range.end,
      status: "processing",
      source_metadata: { extraction: "pdf-text", extractedAt: new Date().toISOString(), questionCount: questions.length },
      pages: selectedPages,
      learning_plan: {},
    }).select("id").single();
    if (insertError || !session?.id) return NextResponse.json({ error: "The paper was read but the learning session could not be created." }, { status: 500 });

    const raw = await callAI(paperPrompt(selectedPages, questions), 5000, { userId: auth.user.id, feature: "paper_learning", subfeature: "build_session", maxChainMs: 55000, perProviderMaxMs: 15000 });
    const plan = raw ? parsePlan(raw) : null;
    if (!plan) {
      await auth.supabase.from("paper_learning_sessions").update({ status: "failed", source_metadata: { extraction: "pdf-text", questionCount: questions.length, error: "Cortex did not return a valid learning plan." } }).eq("id", session.id).eq("user_id", auth.user.id);
      return NextResponse.json({ error: "Cortex couldn't turn these pages into a reliable learning session. The extracted paper is still preserved so you can retry." }, { status: 422 });
    }

    const { error: updateError } = await auth.supabase.from("paper_learning_sessions").update({ status: "processed", learning_plan: plan, source_metadata: { extraction: "pdf-text", questionCount: questions.length, selectedPageCount: selectedPages.length, processedAt: new Date().toISOString() } }).eq("id", session.id).eq("user_id", auth.user.id);
    if (updateError) return NextResponse.json({ error: "The learning plan was generated but could not be saved." }, { status: 500 });

    await awardXPBySource(auth.user.id, "lesson_generation", { difficulty: "medium" });
    return NextResponse.json({ id: session.id, ...plan, pageCount: pages.length, selectedPageStart: range.start, selectedPageEnd: range.end, questionCount: questions.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Something went wrong while processing the paper." }, { status: 500 });
  }
}
