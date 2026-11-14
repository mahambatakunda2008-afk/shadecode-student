import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";
import { parseCortexJson, validateCortexObject } from "@/lib/cortex/outputContract";
import { hasCompleteMathematicalMarkup, isCleanMathematicalAudit, isValidHelpResult, selectHelpResult, type VerifyHelpLevel } from "@/lib/cortex/verify/help-level";
import { isValidVerifyMarkResult } from "@/lib/cortex/verify/result-contract";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const PROVIDER_TIMEOUT_MS = 20_000;
const GEMINI_KEYS = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3].filter(Boolean) as string[];
const GEMINI_MODELS = ["gemini-3.8-flash", "gemini-3-flash-preview"];

const CHECK_SCHEMA = `Return ONLY valid JSON with this shape:
{
  "confidence": 0.0,
  "needsRetake": false,
  "retakeReason": "",
  "problem": "",
  "score": 0,
  "correct": false,
  "cortexInsight": "",
  "steps": [{"description":"","status":"correct|incorrect|partial","note":""}],
  "feedback": "",
  "marksBreakdown": [{"criterion":"","marksLost":0,"note":""}]
}`;

function extractJson(text: string): Record<string, unknown> {
  const parsed = parseCortexJson(text);
  const validation = validateCortexObject(parsed, {
    minTextLength: 3,
    maxTextLength: 20000,
    allowEmptyStringPaths: [
      "retakeReason",
      "problem",
      /^steps\\[\\d+\\]\\.note$/,
      /^marksBreakdown\\[\\d+\\]\\.note$/,
      "level",
      "hint",
      "method",
      "solution",
      "finalAnswer",
      "content",
    ],
  });
  if (!validation.ok) throw new Error("Cortex Verify output failed shared QA.");
  return parsed as Record<string, unknown>;
}

function validCheck(value: unknown) {
  return isValidVerifyMarkResult(value);
}

function checkPrompt(subject: string, question: string, studentAnswer: string, learnerContext = "") {
  return `You are Cortex Verify, a careful academic verifier. Subject: ${subject}.
Question: ${question || "Infer the question from the image if possible."}
Student answer/working: ${studentAnswer || "The student's working is in the image."}

Assess the student's actual reasoning. Distinguish a correct method with an arithmetic slip from a fundamentally incorrect method. Do not invent missing work. If the image is unreadable, set needsRetake=true instead of guessing. Score the work fairly and explain the first important mistake.

Private learner context (use only to tailor remediation after independently marking; NEVER change marks or correctness to match past performance): ${learnerContext || "No prior learner signals."}
${CHECK_SCHEMA}`;
}

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

async function gemini(prompt: string, images: Array<{ data: string; mimeType: string }> = []) {
  let lastError: unknown;
  for (const key of GEMINI_KEYS) {
    const client = new GoogleGenerativeAI(key);
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = client.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json", maxOutputTokens: 5000 } });
        const parts: any[] = [prompt];
        images.forEach((image) => parts.push({ inlineData: image }));
        const result = await withTimeout(model.generateContent(parts));
        return { text: result.response.text(), provider: "gemini", model: modelName };
      } catch (error) { lastError = error; }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No Gemini provider available");
}

async function openAI(prompt: string, images: Array<{ data: string; mimeType: string }> = []) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI provider is not configured");
  const content: any[] = [{ type: "text", text: prompt }];
  images.forEach((image) => content.push({ type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.data}` } }));
  const response = await withTimeout(fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", response_format: { type: "json_object" }, max_tokens: 5000, messages: [{ role: "user", content }] }),
  }));
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${response.status}`);
  return { text: data.choices?.[0]?.message?.content || "", provider: "openai", model: "gpt-4o-mini" };
}

type StructuredVerifyResult = Record<string, unknown> & {
  needsRetake?: boolean;
  retakeReason?: string;
};

async function runStructured(prompt: string, images: Array<{ data: string; mimeType: string }> = []): Promise<StructuredVerifyResult> {
  const providers = [() => gemini(prompt, images), () => openAI(prompt, images)];
  let lastError: unknown;
  for (const provider of providers) {
    try {
      const response = await provider();
      const parsed = extractJson(response.text);
      if (!parsed || typeof parsed !== "object") throw new Error("Cortex Verify returned a non-object result.");
      return {
        ...(parsed as Record<string, unknown>),
        _source: { provider: response.provider, model: response.model },
      };
    } catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new Error("All Cortex providers failed");
}

export async function POST(req: Request) {
  try {
    // Web/PWA sessions authenticate through Supabase SSR cookies. Native clients
    // hold a Supabase access token, so validate that token and use it for RLS too.
    const authorization = req.headers.get("authorization") || "";
    const bearerToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    const supabase = bearerToken
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: { autoRefreshToken: false, persistSession: false },
            global: { headers: { Authorization: `Bearer ${bearerToken}` } },
          },
        )
      : await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      bearerToken || undefined,
    );
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rateLimitResponse = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const formData = await req.formData();
    const mode = String(formData.get("mode") || "check");
    const requestedSubject = String(formData.get("subject") || "").trim();
    const requestedSubjectId = String(formData.get("subjectId") || "").trim();
    const subjectAccess = await resolveLearnerSubject(supabase, user.id, requestedSubject, requestedSubjectId || undefined);
    if (!subjectAccess.ok) return NextResponse.json({ error: subjectAccess.error }, { status: subjectAccess.status });
    const subject = subjectAccess.subject;
    const question = String(formData.get("question") || "").trim();
    const learnerContext = String(formData.get("learnerContext") || "").slice(0, 3000);
    const studentAnswer = String(formData.get("studentAnswer") || "").trim();
    const imageFile = formData.get("image");
    const visualFiles = formData.getAll("visualEvidence").filter((item): item is File => item instanceof File && item.size > 0);
    if (visualFiles.length > 5) return NextResponse.json({ error: "Attach no more than five visual regions at a time." }, { status: 400 });
    if (visualFiles.length > 0 && formData.get("visualEvidenceConsent") !== "true") return NextResponse.json({ error: "Confirm that you agree to send these visual regions to cloud AI." }, { status: 403 });
    const images: Array<{ data: string; mimeType: string }> = [];
    let totalImageBytes = 0;
    if (imageFile instanceof File && imageFile.size > 0) {
      if (!imageFile.type.startsWith("image/")) return NextResponse.json({ error: "Please upload an image file." }, { status: 400 });
      if (imageFile.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "That photo is too large. Try a smaller image." }, { status: 413 });
      totalImageBytes += imageFile.size;
      images.push({ data: Buffer.from(await imageFile.arrayBuffer()).toString("base64"), mimeType: imageFile.type });
    }
    const visualContexts = formData.getAll("visualEvidenceContext").slice(0, 5).map((value) => {
      if (typeof value !== "string") return "";
      try {
        const parsed = JSON.parse(value) as { label?: unknown; annotation?: unknown };
        return [typeof parsed.label === "string" ? parsed.label.slice(0, 100) : "Visual region", typeof parsed.annotation === "string" ? parsed.annotation.slice(0, 1000) : ""].filter(Boolean).join(": ");
      } catch { return "Unlabelled visual region"; }
    });
    for (const file of visualFiles) {
      if (!["image/webp", "image/png", "image/jpeg"].includes(file.type)) return NextResponse.json({ error: "Visual evidence must be WEBP, PNG or JPEG." }, { status: 400 });
      if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Each visual crop must be 4 MB or smaller." }, { status: 413 });
      totalImageBytes += file.size;
      if (totalImageBytes > 8 * 1024 * 1024) return NextResponse.json({ error: "Combined image evidence must be 8 MB or smaller. Select fewer or smaller regions." }, { status: 413 });
      images.push({ data: Buffer.from(await file.arrayBuffer()).toString("base64"), mimeType: file.type });
    }
    const visualContext = visualContexts.length ? "\nVisual evidence supplied by the student (labels/notes are student-provided, not verified):\n" + visualContexts.map((item, index) => (index + 1) + ". " + item).join("\n") : "";
    const evidencePrompt = (prompt: string) => prompt + visualContext;

    if (mode === "check") {
      if (!question && !studentAnswer && images.length === 0) return NextResponse.json({ error: "Add a question, your working, or a photo first." }, { status: 400 });
      const result = await runStructured(evidencePrompt(checkPrompt(subject, question, studentAnswer, learnerContext)), images);
      if (result.needsRetake) return NextResponse.json({ needsRetake: true, retakeReason: result.retakeReason || "I could not read the work clearly enough." }, { status: 422 });
      if (!validCheck(result)) return NextResponse.json({ error: "Cortex returned an unverified assessment. No score was recorded. Please try again." }, { status: 502 });
      return NextResponse.json(result);
    }

    if (mode === "help") {
      const level = String(formData.get("level") || "hint");
      if (!["hint", "method", "solution"].includes(level)) return NextResponse.json({ error: "Choose a valid help level." }, { status: 400 });
      if (!question && images.length === 0) return NextResponse.json({ error: "Add the question or a photo first." }, { status: 400 });
      const instruction = level === "hint"
        ? "Give one useful hint only. Do not provide the method, solution, final answer, or content that reveals them. Return the hint field only."
        : level === "method"
          ? "Explain the relevant method and next steps, but do not provide the final answer or a complete worked solution. Return the method field only."
          : "Give a complete worked solution because the student explicitly requested it. Return the solution and finalAnswer fields where appropriate.";
      const prompt = `You are Cortex, an expert ${subject} teacher producing a mathematically precise, fully readable worked explanation. Subject: ${subject}. Question: ${question || "Read the question from the image."} Student attempt: ${studentAnswer || "The student has not provided an attempt yet."} Help level: ${level}. ${instruction}\n\nPrivate learner context: ${learnerContext || "No prior learner signals."} Adapt your explanation to recurring errors and avoid repeating the same question when a fresh transfer question can test the same skill. Do not assume the learner has mastered or failed a concept solely from this context.

FORMATTING RULES (mandatory): Write every mathematical expression using valid LaTeX delimiters: use \\( ... \\) for inline mathematics and \\[ ... \\] for standalone/display mathematics. Never leave equations, variables, subscripts, superscripts, fractions, roots, coordinates or operators as unformatted plain-text fragments. Use valid LaTeX such as \\frac{a}{b}, \\sqrt{10}, x_{B}, r^2, and \\begin{aligned}...\\end{aligned}. Keep each complete expression inside its delimiters. Do not split a mathematical expression across ordinary prose lines. Define every symbol before using it, preserve all signs and brackets, and show substitutions in complete equations. Use numbered steps with one clear operation per step. End with a clearly labelled final answer. Before returning, independently check every substitution, arithmetic operation, sign, coordinate, exponent and final result; the finalAnswer must agree exactly with the worked solution. If the question image is unclear or a symbol cannot be read confidently, state the uncertainty and do not guess. Never omit mathematical symbols to make the prose shorter.

Keep explanations student-friendly and curriculum-aware. Return ONLY valid JSON with the requested help-level field; all math delimiters must be inside the JSON string values.`;
      const result = await runStructured(evidencePrompt(prompt), images);
      const helpLevel = level as VerifyHelpLevel;
      if (!isValidHelpResult(result, helpLevel)) return NextResponse.json({ error: "Cortex returned incomplete help for the selected level. Please try again." }, { status: 502 });
      if (helpLevel === "solution" && /math/i.test(subject)) {
        const solutionText = typeof result.solution === "string" ? result.solution : typeof result.content === "string" ? result.content : "";
        if (!hasCompleteMathematicalMarkup(solutionText)) {
          return NextResponse.json({ error: "Cortex could not preserve the mathematical notation in this solution. Please try again." }, { status: 502 });
        }

        // Independently audit the completed derivation against the original
        // question. This catches contradictions between working and finalAnswer.
        const auditPrompt = `Act as an independent Cambridge Mathematics examiner. Audit this worked solution without rewriting it.
Original question: ${question || "Read the question from the supplied image evidence."}
Worked solution: ${solutionText}
Claimed final answer: ${typeof result.finalAnswer === "string" ? result.finalAnswer : "(not separately supplied)"}
Return ONLY JSON: {"consistent":true,"issues":[]}
Set consistent=false if any substitution, arithmetic, sign, coordinate, exponent, equation, or final answer is wrong, missing, or contradicts another line. Recalculate independently from the original question and any supplied image evidence. Do not accept a final answer merely because it repeats the solution. If the question is ambiguous or cannot be independently checked, set consistent=false and explain why in issues.`;
        // Include the original image evidence as well. Without it, image-only
        // questions cannot be independently audited and must not be guessed.
        const audit = await runStructured(auditPrompt, images);
        if (!isCleanMathematicalAudit(audit)) {
          return NextResponse.json({ error: "Cortex detected a possible mathematical inconsistency and withheld this solution. Please try again." }, { status: 502 });
        }
      }
      return NextResponse.json(selectHelpResult(result, helpLevel));
    }

    return NextResponse.json({ error: "Unknown Cortex mode." }, { status: 400 });
  } catch (error) {
    console.error("[cortex/verify]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Cortex Verify is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
