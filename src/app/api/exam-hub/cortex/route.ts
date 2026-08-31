import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROVIDER_TIMEOUT_MS = 20_000;
const MAX_QUESTION_CHARS = 12_000;
const MAX_PAPER_QUESTIONS = 80;
const GEMINI_KEYS = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3].filter(Boolean) as string[];
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

async function withTimeout<T>(promise: Promise<T>, ms = PROVIDER_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Provider request timed out")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : text);
}

async function generate(prompt: string) {
  let lastError: unknown;
  for (const key of GEMINI_KEYS) {
    const client = new GoogleGenerativeAI(key);
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 5000 },
        });
        const result = await withTimeout(model.generateContent(prompt));
        return { text: result.response.text(), provider: "gemini", model: modelName };
      } catch (error) {
        lastError = error;
      }
    }
  }

  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const response = await withTimeout(fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          max_tokens: 5000,
          messages: [{ role: "user", content: prompt }],
        }),
      }));
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${response.status}`);
      return { text: data.choices?.[0]?.message?.content || "", provider: "openai", model: "gpt-4o-mini" };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("No Cortex provider is configured");
}

function safeString(value: FormDataEntryValue | null, max = MAX_QUESTION_CHARS) {
  return String(value ?? "").trim().slice(0, max);
}

function questionPrompt(subject: string, question: string) {
  return `You are Cortex, an exam-focused tutor inside Shadecode Student.
Subject: ${subject || "General"}
Question: ${question}

Help the student learn, not merely copy an answer. Explain the key concept, identify the likely method, give one useful hint, and provide a worked solution only as a separate field. Never invent information that is absent from the question. Return ONLY JSON:
{
  "concept": "short concept name",
  "hint": "short nudge",
  "method": ["step 1", "step 2"],
  "solution": "clear worked explanation",
  "finalAnswer": "final answer if determinable",
  "examTip": "one practical exam tip"
}`;
}

function paperPrompt(subject: string, questions: Array<{ question_number: string; question_text: string; marks: number | null }>) {
  const corpus = questions.map((q) => `Q${q.question_number}${q.marks ? ` [${q.marks} marks]` : ""}: ${q.question_text}`).join("\n\n");
  return `You are Cortex, an assessment-intelligence engine for Shadecode Student.
Subject: ${subject || "General"}
Below is a set of questions extracted from a legitimate past paper. Treat the extracted text as evidence. Do not claim a topic is present unless the question supports it, and do not predict an exam question with certainty.

${corpus}

Return ONLY JSON:
{
  "overview": "2-3 sentence paper overview",
  "topics": [{"name":"topic","evidence":"brief evidence from question numbers","questionNumbers":["1","2"],"frequency":1}],
  "highYieldAreas": ["areas repeatedly assessed"],
  "questionPatterns": ["observable question patterns"],
  "revisionPlan": ["specific revision actions"],
  "predictionCaveat": "brief warning that recurrence is not a guarantee"
}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rateLimitResponse = await applyRateLimit(request, aiEndpointLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const mode = body?.mode === "paper-analysis" ? "paper-analysis" : "question-help";
    const subject = safeString(body?.subject);

    if (mode === "question-help") {
      const question = safeString(body?.question);
      if (question.length < 3) return NextResponse.json({ error: "A question is required." }, { status: 400 });
      const response = await generate(questionPrompt(subject, question));
      return NextResponse.json({ ...extractJson(response.text), _source: { provider: response.provider, model: response.model } });
    }

    const paperId = safeString(body?.paperId, 100);
    if (!paperId) return NextResponse.json({ error: "paperId is required." }, { status: 400 });

    const { data: paper, error: paperError } = await supabase
      .from("past_papers")
      .select("id,syllabus_id,level,session,year,paper_number,variant")
      .eq("id", paperId)
      .maybeSingle();
    if (paperError) throw paperError;
    if (!paper) return NextResponse.json({ error: "Past paper not found." }, { status: 404 });

    const { data: questions, error: questionsError } = await supabase
      .from("exam_questions")
      .select("question_number,question_text,marks")
      .eq("paper_id", paperId)
      .not("question_text", "is", null)
      .order("question_number")
      .limit(MAX_PAPER_QUESTIONS);
    if (questionsError) throw questionsError;
    if (!questions?.length) return NextResponse.json({ error: "This paper has not been indexed into individual questions yet." }, { status: 409 });

    const response = await generate(paperPrompt(subject || paper.syllabus_id, questions));
    return NextResponse.json({
      paper,
      indexedQuestionCount: questions.length,
      ...extractJson(response.text),
      _source: { provider: response.provider, model: response.model },
    });
  } catch (error) {
    console.error("[exam-hub/cortex]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Cortex exam intelligence is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
