import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const PROVIDER_TIMEOUT_MS = 20_000;
const GEMINI_KEYS = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3].filter(Boolean) as string[];
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

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

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : text);
}

function validCheck(value: any) {
  return value && typeof value.score === "number" && typeof value.correct === "boolean" && typeof value.cortexInsight === "string" && Array.isArray(value.steps);
}

function checkPrompt(subject: string, question: string, studentAnswer: string) {
  return `You are Cortex Verify, a careful academic verifier. Subject: ${subject}.
Question: ${question || "Infer the question from the image if possible."}
Student answer/working: ${studentAnswer || "The student's working is in the image."}

Assess the student's actual reasoning. Distinguish a correct method with an arithmetic slip from a fundamentally incorrect method. Do not invent missing work. If the image is unreadable, set needsRetake=true instead of guessing. Score the work fairly and explain the first important mistake. ${CHECK_SCHEMA}`;
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

async function gemini(prompt: string, image?: { data: string; mimeType: string }) {
  let lastError: unknown;
  for (const key of GEMINI_KEYS) {
    const client = new GoogleGenerativeAI(key);
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = client.getGenerativeModel({ model: modelName, generationConfig: { responseMimeType: "application/json", maxOutputTokens: 5000 } });
        const parts: any[] = [prompt];
        if (image) parts.push({ inlineData: image });
        const result = await withTimeout(model.generateContent(parts));
        return { text: result.response.text(), provider: "gemini", model: modelName };
      } catch (error) { lastError = error; }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No Gemini provider available");
}

async function openAI(prompt: string, image?: { data: string; mimeType: string }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI provider is not configured");
  const content: any[] = [{ type: "text", text: prompt }];
  if (image) content.push({ type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.data}` } });
  const response = await withTimeout(fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", response_format: { type: "json_object" }, max_tokens: 5000, messages: [{ role: "user", content }] }),
  }));
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${response.status}`);
  return { text: data.choices?.[0]?.message?.content || "", provider: "openai", model: "gpt-4o-mini" };
}

async function runStructured(prompt: string, image?: { data: string; mimeType: string }) {
  const providers = [() => gemini(prompt, image), () => openAI(prompt, image)];
  let lastError: unknown;
  for (const provider of providers) {
    try {
      const response = await provider();
      return { ...extractJson(response.text), _source: { provider: response.provider, model: response.model } };
    } catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new Error("All Cortex providers failed");
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rateLimitResponse = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitResponse) return rateLimitResponse;

    const formData = await req.formData();
    const mode = String(formData.get("mode") || "check");
    const subject = String(formData.get("subject") || "General").trim();
    const question = String(formData.get("question") || "").trim();
    const studentAnswer = String(formData.get("studentAnswer") || "").trim();
    const imageFile = formData.get("image");

    let image: { data: string; mimeType: string } | undefined;
    if (imageFile instanceof File && imageFile.size > 0) {
      if (!imageFile.type.startsWith("image/")) return NextResponse.json({ error: "Please upload an image file." }, { status: 400 });
      if (imageFile.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "That photo is too large. Try a smaller image." }, { status: 413 });
      image = { data: Buffer.from(await imageFile.arrayBuffer()).toString("base64"), mimeType: imageFile.type };
    }

    if (mode === "check") {
      if (!question && !studentAnswer && !image) return NextResponse.json({ error: "Add a question, your working, or a photo first." }, { status: 400 });
      const result = await runStructured(checkPrompt(subject, question, studentAnswer), image);
      if (result.needsRetake) return NextResponse.json({ needsRetake: true, retakeReason: result.retakeReason || "I could not read the work clearly enough." }, { status: 422 });
      if (!validCheck(result)) return NextResponse.json({ error: "Cortex returned an incomplete assessment. Please try again." }, { status: 502 });
      return NextResponse.json(result);
    }

    if (mode === "help") {
      const level = String(formData.get("level") || "hint");
      if (!question && !image) return NextResponse.json({ error: "Add the question or a photo first." }, { status: 400 });
      const instruction = level === "hint" ? "Give a short hint that nudges the student without revealing the answer." : level === "method" ? "Explain the method and steps without giving the final answer." : "Give a complete worked solution because the student explicitly requested it.";
      const prompt = `You are Cortex, an educational tutor. Subject: ${subject}. Question: ${question || "Read the question from the image."} Help level: ${level}. ${instruction} Return ONLY JSON with keys level, hint, method, solution, finalAnswer, content as appropriate. Keep explanations student-friendly.`;
      return NextResponse.json(await runStructured(prompt, image));
    }

    return NextResponse.json({ error: "Unknown Cortex mode." }, { status: 400 });
  } catch (error) {
    console.error("[cortex/verify]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Cortex Verify is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
