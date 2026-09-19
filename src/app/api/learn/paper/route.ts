import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { callAI } from "@/lib/ai";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { awardXPBySource } from "@/lib/xp/manager";
import { applyQuestionCorrections, buildPaperSourceText, extractPdfPages, normalizePageRange, selectPaperQuestions, type PaperPage, type PaperQuestionCorrection } from "@/lib/learn/paperLearning";
import { extractTopLevelQuestionsFromPages } from "@/lib/exam/question-extraction";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_PAGES = 40;
const DEFAULT_PAGE_END = 8;

type AuthContext = { supabase: SupabaseClient; user: User };
type Interaction = { prompt?: string; evaluationMode?: string; expectedConcepts?: string[]; rubric?: string; modelAnswer?: string; hints?: string[] };
type Block = { id: string; type: string; title?: string; content: string; sourcePages?: number[]; interaction?: Interaction };
type Plan = { title?: string; overview?: string; subject?: string; level?: string; board?: string; topics?: string[]; blocks?: Block[] };
type QuestionSelection = { questionNumber: string; sourcePageStart: number; sourcePageEnd: number; questionText: string; marks: number | null; extractionConfidence: number; extractionMethod: string };

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
    const value = JSON.parse(candidate) as { title?: unknown; overview?: unknown; subject?: unknown; level?: unknown; board?: unknown; topics?: unknown; blocks?: unknown };
    if (typeof value.title !== "string" || !value.title.trim() || !Array.isArray(value.blocks)) return null;
    const blocks = value.blocks.filter((block): block is Block => {
      if (!block || typeof block !== "object") return false;
      const item = block as Record<string, unknown>;
      if (typeof item.type !== "string" || typeof item.content !== "string" || item.content.trim().length < 20) return false;
      const interaction = item.interaction && typeof item.interaction === "object" ? item.interaction as Record<string, unknown> : undefined;
      if ((item.type === "checkpoint" || item.type === "mastery") && (!interaction || typeof interaction.prompt !== "string" || interaction.prompt.trim().length < 10 || typeof interaction.rubric !== "string" || interaction.rubric.trim().length < 10 || typeof interaction.modelAnswer !== "string" || interaction.modelAnswer.trim().length < 2)) return false;
      return true;
    }).slice(0, 24).map((item, index) => ({
      ...item,
      id: typeof item.id === "string" && item.id.trim() ? item.id.trim().slice(0, 80) : `block-${index + 1}`,
      sourcePages: Array.isArray(item.sourcePages) ? item.sourcePages.filter((n): n is number => typeof n === "number" && Number.isInteger(n) && n > 0).slice(0, 8) : [],
      interaction: item.interaction && typeof item.interaction === "object" ? {
        ...(item.interaction as Interaction),
        expectedConcepts: Array.isArray((item.interaction as Interaction).expectedConcepts) ? (item.interaction as Interaction).expectedConcepts!.filter((x): x is string => typeof x === "string").slice(0, 8) : [],
        hints: Array.isArray((item.interaction as Interaction).hints) ? (item.interaction as Interaction).hints!.filter((x): x is string => typeof x === "string").slice(0, 3) : [],
      } : undefined,
    }));
    if (blocks.length < 4) return null;
    return {
      title: value.title.trim().slice(0, 255),
      overview: typeof value.overview === "string" ? value.overview.trim().slice(0, 2000) : "",
      subject: typeof value.subject === "string" ? value.subject.trim().slice(0, 120) : "",
      level: typeof value.level === "string" ? value.level.trim().slice(0, 120) : "",
      board: typeof value.board === "string" ? value.board.trim().slice(0, 120) : "",
      topics: Array.isArray(value.topics) ? value.topics.filter((x): x is string => typeof x === "string").map(x => x.trim()).filter(Boolean).slice(0, 20) : [],
      blocks,
    } satisfies Plan;
  } catch {
    return null;
  }
}

function safePlan(plan: Plan) {
  return {
    title: plan.title || "Learning from your paper",
    overview: plan.overview || "Cortex built this session from the selected source pages.",
    subject: plan.subject || "",
    level: plan.level || "",
    board: plan.board || "",
    topics: plan.topics ?? [],
    blocks: (plan.blocks ?? []).map(({ interaction, ...block }) => ({
      ...block,
      interaction: interaction ? {
        prompt: interaction.prompt,
        evaluationMode: interaction.evaluationMode,
        expectedConcepts: interaction.expectedConcepts,
      } : undefined,
    })),
  };
}

function paperPrompt(pages: PaperPage[], questions: ReturnType<typeof extractTopLevelQuestionsFromPages>, selectedQuestionNumbers: string[], correctedQuestionNumbers: string[]) {
  const source = buildPaperSourceText(pages);
  const questionIndex = questions.length
    ? questions.map(q => `Q${q.questionNumber}: pages ${q.sourcePageStart}-${q.sourcePageEnd}; marks ${q.marks ?? "unknown"}; confidence ${q.extractionConfidence}`).join("\n")
    : "No reliable top-level question index was extracted. Do not invent one.";
  const corrections = correctedQuestionNumbers.length
    ? `USER-VERIFIED QUESTION CORRECTIONS: ${correctedQuestionNumbers.map(number => `Q${number}`).join(", ")}. Use the corrected wording below as the student-verified transcription, while preserving the original extraction in provenance.`
    : "NO USER-VERIFIED QUESTION CORRECTIONS WERE PROVIDED.";
  const selection = selectedQuestionNumbers.length
    ? `ONLY THESE QUESTIONS ARE IN SCOPE: ${selectedQuestionNumbers.map(number => `Q${number}`).join(", ")}. You may use surrounding source text for prerequisites/context, but do not teach or solve unrelated questions.`
    : "QUESTION SCOPE: all reliably extracted top-level questions in the selected pages.";

  return `You are Cortex, the learning engine inside Shadecode Student. Turn the student's actual source pages into a grounded learning session. This is NOT an answer dump and NOT a generic textbook lesson.

SELECTED SOURCE PAGES
${source}

EXTRACTED QUESTION INDEX
${questionIndex}

${selection}

RULES
1. Stay grounded in the supplied pages. Never invent missing question text, values, diagrams, marks, syllabus claims or provenance.
2. Preserve page and question references whenever discussing a question.
3. Identify the most defensible subject, level and exam board from the source. If uncertain, use an empty string rather than guessing.
4. Build a compact topic map of the concepts actually taught/tested in these pages. Do not manufacture syllabus topics.
5. First explain what the selected pages cover and what each question is testing.
6. Teach prerequisite concepts before the method when needed.
7. For worked reasoning, explain WHY each step is taken, not merely the algebra.
8. Highlight recognition patterns only when the source supports that classification.
9. Include 2-6 interactive checkpoints and finish with a mastery check. Checkpoints must make the student think, not merely recall a sentence.
10. For every checkpoint/mastery block, provide interaction.prompt, interaction.evaluationMode (conceptual|numeric|steps|mixed), interaction.expectedConcepts, interaction.rubric, interaction.modelAnswer, and 1-3 progressive interaction.hints. The rubric must describe what a correct, partial, and incorrect response would demonstrate. Keep modelAnswer and rubric server-side by treating them as tutor evaluation data.
11. Do not reveal the checkpoint answer in the block content. The modelAnswer is only for the evaluator.
12. Include common traps only when supported by the actual mathematics/question structure. Do not invent examiner claims.
13. Finish with NEW mastery questions based on the concepts encountered. Do not simply repeat source questions.
14. If a page has no selectable text, explicitly say that the page may require visual/OCR inspection. Do not hallucinate its contents.
15. Use concise, scannable student-facing blocks. Every mathematical expression must be wrapped in single-dollar LaTeX delimiters.

Return ONLY JSON:
{"title":"specific learning-session title","overview":"what these pages cover","subject":"defensible subject or empty","level":"defensible level or empty","board":"defensible exam board or empty","topics":["concept actually covered"],"blocks":[{"id":"b1","type":"source-map|concept|definition|method|example|checkpoint|mistake|pattern|application|mastery|summary","title":"short heading","content":"student-facing explanation","sourcePages":[1],"interaction":{"prompt":"question for the student","evaluationMode":"mixed","expectedConcepts":["concept"],"rubric":"evaluation rubric","modelAnswer":"answer or reasoning","hints":["small hint","stronger hint"]}}]}`;
}

export async function GET(req: Request) {
  const auth = await authenticate(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const { data, error } = await auth.supabase.from("paper_learning_sessions").select("id,source_name,mime_type,source_size_bytes,page_count,selected_page_start,selected_page_end,status,source_metadata,pages,learning_plan,progress,created_at,updated_at").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Couldn't load the paper session." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Paper session not found." }, { status: 404 });
    return NextResponse.json({ ...data, learning_plan: safePlan(data.learning_plan as Plan) });
  }
  const { data, error } = await auth.supabase.from("paper_learning_sessions").select("id,source_name,page_count,selected_page_start,selected_page_end,status,learning_plan,progress,created_at,updated_at").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(20);
  if (error) return NextResponse.json({ error: "Couldn't load paper sessions." }, { status: 500 });
  return NextResponse.json({ sessions: (data ?? []).map(session => ({ ...session, learning_plan: safePlan(session.learning_plan as Plan) })) });
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
    const inspectOnly = String(form.get("inspect") ?? "").toLowerCase() === "1" || String(form.get("inspect") ?? "").toLowerCase() === "true";
    if (inspectOnly) {
      const inspectQuestions: QuestionSelection[] = questions.map(question => ({
        questionNumber: question.questionNumber,
        sourcePageStart: question.sourcePageStart ?? range.start,
        sourcePageEnd: question.sourcePageEnd ?? range.end,
        questionText: question.questionText.slice(0, 1200),
        marks: question.marks,
        extractionConfidence: question.extractionConfidence,
        extractionMethod: question.extractionMethod,
      }));
      return NextResponse.json({ pageCount: pages.length, selectedPageStart: range.start, selectedPageEnd: range.end, questions: inspectQuestions });
    }

    const rawCorrections = form.get("questionCorrections");
    let requestedCorrections: PaperQuestionCorrection[] = [];
    if (typeof rawCorrections === "string" && rawCorrections.trim()) {
      try {
        const parsed = JSON.parse(rawCorrections);
        if (Array.isArray(parsed)) {
          requestedCorrections = parsed.filter((value): value is PaperQuestionCorrection => Boolean(value && typeof value === "object" && typeof (value as Record<string, unknown>).questionNumber === "string" && typeof (value as Record<string, unknown>).correctedText === "string"));
        }
      } catch {
        requestedCorrections = [];
      }
    }

    const rawQuestionSelection = form.get("questionNumbers");
    let requestedQuestionNumbers: string[] = [];
    if (typeof rawQuestionSelection === "string" && rawQuestionSelection.trim()) {
      try {
        const parsed = JSON.parse(rawQuestionSelection);
        if (Array.isArray(parsed)) requestedQuestionNumbers = parsed.filter((value): value is string => typeof value === "string").map(value => value.trim()).filter(Boolean);
      } catch {
        requestedQuestionNumbers = rawQuestionSelection.split(",").map(value => value.trim()).filter(Boolean);
      }
    }
    requestedQuestionNumbers = [...new Set(requestedQuestionNumbers)].slice(0, 40);
    const questionSelection = selectPaperQuestions(questions, requestedQuestionNumbers);
    const selectedQuestionNumbers = questionSelection.requestedNumbers.filter(number => !questionSelection.missingNumbers.includes(number));
    if (requestedQuestionNumbers.length > 0 && selectedQuestionNumbers.length === 0) {
      return NextResponse.json({ error: "None of the selected questions could be traced to the extracted paper." }, { status: 422 });
    }
    const correctionResult = applyQuestionCorrections(questionSelection.selected, requestedCorrections.slice(0, 40));
    if (correctionResult.invalidNumbers.length) {
      return NextResponse.json({ error: `A correction referenced an unknown question: Q${correctionResult.invalidNumbers[0]}.` }, { status: 422 });
    }
    const correctedQuestionNumbers = correctionResult.appliedNumbers;
    const scopedQuestions = correctionResult.questions;

    const { data: session, error: insertError } = await auth.supabase.from("paper_learning_sessions").insert({
      user_id: auth.user.id,
      source_name: file.name.slice(0, 255),
      mime_type: file.type || "application/pdf",
      source_size_bytes: file.size,
      page_count: pages.length,
      selected_page_start: range.start,
      selected_page_end: range.end,
      status: "processing",
      source_metadata: { extraction: "pdf-text", extractedAt: new Date().toISOString(), questionCount: questions.length, selectionMode: selectedQuestionNumbers.length ? "questions" : "pages", selectedQuestionNumbers, questionIndex: questions.map(question => ({ questionNumber: question.questionNumber, sourcePageStart: question.sourcePageStart, sourcePageEnd: question.sourcePageEnd, questionText: question.questionText.slice(0, 6000), originalQuestionText: question.questionText.slice(0, 6000), correctedQuestionText: null, correctionStatus: "extracted", extractionConfidence: question.extractionConfidence, extractionMethod: question.extractionMethod })) },
      pages: selectedPages,
      learning_plan: {},
      progress: {},
    }).select("id").single();
    if (insertError || !session?.id) return NextResponse.json({ error: "The paper was read but the learning session could not be created." }, { status: 500 });

    const raw = await callAI(paperPrompt(selectedPages, scopedQuestions, selectedQuestionNumbers, correctedQuestionNumbers), 6500, { userId: auth.user.id, feature: "paper_learning", subfeature: "build_session", maxChainMs: 55000, perProviderMaxMs: 15000 });
    const plan = raw ? parsePlan(raw) : null;
    if (!plan) {
      await auth.supabase.from("paper_learning_sessions").update({ status: "failed", source_metadata: { extraction: "pdf-text", questionCount: questions.length, selectedQuestionNumbers, questionIndex: questions.map(question => { const corrected = correctionResult.questions.find(item => item.questionNumber === question.questionNumber)?.questionText ?? question.questionText; return { questionNumber: question.questionNumber, sourcePageStart: question.sourcePageStart, sourcePageEnd: question.sourcePageEnd, questionText: corrected.slice(0, 6000), originalQuestionText: question.questionText.slice(0, 6000), correctedQuestionText: corrected !== question.questionText ? corrected.slice(0, 6000) : null, correctionStatus: corrected !== question.questionText ? "user-verified" : "extracted", extractionConfidence: question.extractionConfidence, extractionMethod: question.extractionMethod }; }), error: "Cortex did not return a valid learning plan." } }).eq("id", session.id).eq("user_id", auth.user.id);
      return NextResponse.json({ error: "Cortex couldn't turn these pages into a reliable learning session. The extracted paper is still preserved so you can retry." }, { status: 422 });
    }

    const { error: updateError } = await auth.supabase.from("paper_learning_sessions").update({ status: "processed", learning_plan: plan, source_metadata: { extraction: "pdf-text", extractedAt: new Date().toISOString(), questionCount: questions.length, selectedPageCount: selectedPages.length, selectedPageStart: range.start, selectedPageEnd: range.end, selectionMode: selectedQuestionNumbers.length ? "questions" : "pages", selectedQuestionNumbers, questionIndex: questions.map(question => { const corrected = correctionResult.questions.find(item => item.questionNumber === question.questionNumber)?.questionText ?? question.questionText; return { questionNumber: question.questionNumber, sourcePageStart: question.sourcePageStart, sourcePageEnd: question.sourcePageEnd, questionText: corrected.slice(0, 6000), originalQuestionText: question.questionText.slice(0, 6000), correctedQuestionText: corrected !== question.questionText ? corrected.slice(0, 6000) : null, correctionStatus: corrected !== question.questionText ? "user-verified" : "extracted", extractionConfidence: question.extractionConfidence, extractionMethod: question.extractionMethod }; }), pageHashes: selectedPages.map(page => ({ pageNumber: page.pageNumber, textHash: page.textHash })), sourceFingerprint: selectedPages.map(page => page.textHash).join(":"), subject: plan.subject || null, level: plan.level || null, board: plan.board || null, topics: plan.topics ?? [], processedAt: new Date().toISOString() } }).eq("id", session.id).eq("user_id", auth.user.id);
    if (updateError) return NextResponse.json({ error: "The learning plan was generated but could not be saved." }, { status: 500 });

    await awardXPBySource(auth.user.id, "lesson_generation", { difficulty: "medium" });
    return NextResponse.json({ id: session.id, ...safePlan(plan), pageCount: pages.length, selectedPageStart: range.start, selectedPageEnd: range.end, questionCount: questions.length, selectedQuestionNumbers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Something went wrong while processing the paper." }, { status: 500 });
  }
}
