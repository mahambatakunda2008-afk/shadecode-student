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
const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3-flash-preview"];

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

function extractJson(text: string): unknown {
  const cleaned = text.trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : cleaned).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(candidate.slice(start, end + 1)); } catch {}
    }
    throw new Error("Cortex returned malformed structured output.");
  }
}

function validTutorPayload(value: unknown): value is {
  content: string;
  type: "question" | "guidance" | "feedback" | "explanation" | "reinforcement";
  confidence?: number;
} {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.content === "string" &&
    v.content.trim().length >= 20 &&
    ["question", "guidance", "feedback", "explanation", "reinforcement"].includes(String(v.type)) &&
    (v.confidence === undefined || (typeof v.confidence === "number" && Number.isFinite(v.confidence) && v.confidence >= 0 && v.confidence <= 1));
}

function isNonEmptyString(value: unknown, min = 1, max = 12_000): value is string {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

function validQuestionHelp(value: unknown): value is {
  concept: string;
  hint: string;
  method: string[];
  solution: string;
  finalAnswer: string;
  examTip: string;
} {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return isNonEmptyString(v.concept, 3, 500) &&
    isNonEmptyString(v.hint, 10, 2_000) &&
    Array.isArray(v.method) &&
    v.method.length >= 2 &&
    v.method.length <= 12 &&
    v.method.every((step) => isNonEmptyString(step, 5, 2_000)) &&
    isNonEmptyString(v.solution, 20, 8_000) &&
    isNonEmptyString(v.finalAnswer, 1, 2_000) &&
    isNonEmptyString(v.examTip, 10, 1_000);
}

function validPaperAnalysis(value: unknown): value is {
  overview: string;
  topics: Array<{ name: string; evidence: string; questionNumbers: string[]; frequency: number }>;
  highYieldAreas: string[];
  questionPatterns: string[];
  revisionPlan: string[];
  predictionCaveat: string;
} {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const topics = Array.isArray(v.topics) ? v.topics : [];
  const lists = [v.highYieldAreas, v.questionPatterns, v.revisionPlan];
  return isNonEmptyString(v.overview, 30, 3_000) &&
    topics.length >= 1 &&
    topics.length <= 30 &&
    topics.every((topic) => {
      if (!topic || typeof topic !== "object") return false;
      const t = topic as Record<string, unknown>;
      return isNonEmptyString(t.name, 2, 300) &&
        isNonEmptyString(t.evidence, 5, 1_000) &&
        Array.isArray(t.questionNumbers) &&
        t.questionNumbers.length >= 1 &&
        t.questionNumbers.length <= 20 &&
        t.questionNumbers.every((n) => isNonEmptyString(n, 1, 30)) &&
        typeof t.frequency === "number" &&
        Number.isInteger(t.frequency) &&
        t.frequency >= 1;
    }) &&
    lists.every((list) => Array.isArray(list) && list.length >= 1 && list.length <= 20 && list.every((item) => isNonEmptyString(item, 5, 1_000))) &&
    isNonEmptyString(v.predictionCaveat, 20, 1_000);
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
    const mode: "paper-analysis" | "tutor" | "question-help" = body?.mode === "paper-analysis" ? "paper-analysis" : body?.mode === "tutor" ? "tutor" : "question-help";
    const subject = safeString(body?.subject);
    if (mode === "tutor") {
      const question = safeString(body?.question);
      const topic = safeString(body?.topic, 300);
      const context = Array.isArray(body?.previousContext) ? body.previousContext.slice(-10) : [];
      const style = safeString(body?.explanationStyle, 80);
      if (question.length < 2) return NextResponse.json({ error: "A tutoring question is required." }, { status: 400 });

      const prompt = `You are Cortex, a rigorous Socratic tutor inside Shadecode Student.
Subject: ${subject || "General"}
Topic: ${topic || "unspecified"}
Explanation style: ${style || "guided"}
Conversation context: ${JSON.stringify(context)}

Respond as a tutor, not a generic chatbot. Make the student think, but give enough explanation to move them forward. Never invent syllabus facts. If the student asks for an explanation, explain the concept clearly. If they are solving a problem, identify the next useful reasoning step and explain why. Return ONLY JSON:
{"content":"the tutor response","type":"question|guidance|feedback|explanation|reinforcement","confidence":0.0}`;
      const response = await generate(prompt);
      const payload = extractJson(response.text);
      if (!validTutorPayload(payload)) {
        return NextResponse.json({ error: "Cortex tutor output did not pass its teaching-quality gate. Please retry." }, { status: 502 });
      }
      return NextResponse.json({ ...(payload as Record<string, unknown>), _source: { provider: response.provider, model: response.model } });
    }

    if (mode === "question-help") {
      const question = safeString(body?.question);
      const questionPaperId = safeString(body?.paperId, 100);
      if (question.length < 3) return NextResponse.json({ error: "A question is required." }, { status: 400 });

      let resolvedQuestionSubject = subject;
      if (questionPaperId) {
        const { data: sourcePaper, error: sourcePaperError } = await supabase
          .from("past_papers")
          .select("id,syllabus_id,level,session,year,paper_number,variant")
          .eq("id", questionPaperId)
          .maybeSingle();
        if (sourcePaperError) throw sourcePaperError;
        if (!sourcePaper) return NextResponse.json({ error: "Past paper not found." }, { status: 404 });
        const { data: syllabus, error: syllabusError } = await supabase
          .from("syllabi")
          .select("id,subject,board")
          .eq("id", sourcePaper.syllabus_id)
          .maybeSingle();
        if (syllabusError) throw syllabusError;
        resolvedQuestionSubject = String(syllabus?.subject || subject || "").trim();
        if (!resolvedQuestionSubject) {
          return NextResponse.json({ error: "The paper's syllabus could not be resolved." }, { status: 409 });
        }
      }

      const response = await generate(questionPrompt(resolvedQuestionSubject, question));
      const payload = extractJson(response.text);
      if (!validQuestionHelp(payload)) {
        return NextResponse.json({ error: "Cortex question help did not pass its teaching-quality gate. Please retry." }, { status: 502 });
      }
      return NextResponse.json({ ...(payload as Record<string, unknown>), _source: { provider: response.provider, model: response.model } });
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

    const { data: paperSyllabus, error: paperSyllabusError } = await supabase
      .from("syllabi")
      .select("id,subject,board")
      .eq("id", paper.syllabus_id)
      .maybeSingle();
    if (paperSyllabusError) throw paperSyllabusError;
    const analysisSubject = String(paperSyllabus?.subject || subject || "").trim();
    if (!analysisSubject) {
      return NextResponse.json({ error: "The paper's syllabus could not be resolved." }, { status: 409 });
    }

    const response = await generate(paperPrompt(analysisSubject, questions));
    const analysis = extractJson(response.text);
    if (!validPaperAnalysis(analysis)) {
      return NextResponse.json({ error: "Cortex paper analysis did not pass its evidence-quality gate. Please retry." }, { status: 502 });
    }
    return NextResponse.json({
      paper,
      indexedQuestionCount: questions.length,
      ...analysis,
      _source: { provider: response.provider, model: response.model },
    });
  } catch (error) {
    console.error("[exam-hub/cortex]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Cortex exam intelligence is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
