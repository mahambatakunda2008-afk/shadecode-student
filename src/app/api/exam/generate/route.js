import { NextResponse } from "next/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examGenerateSchema, validateRequestBody } from "@/lib/validation/schemas";
import { logAIUsage } from "@/lib/ai/tracker";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

// Optimized AI Caller with shorter timeouts for faster fallbacks
async function callAI(prompt, userId) {
  const promptTokens = Math.ceil(prompt.length / 4);

  // Helper for fetch with timeout
  const fetchWithTimeout = (url, options, timeout = 8000) => {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ]);
  };

  // 1. TRY OPENAI FIRST (Most reliable for JSON)
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: "You are a JSON-only generator." }, { role: "user", content: prompt }],
          response_format: { type: "json_object" } // Force JSON
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    } catch (err) { console.error("OpenAI Fallback Triggered"); }
  }

  // 2. TRY GEMINI (Corrected model names)
  const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean);
  for (const key of geminiKeys) {
    // FIXED: Using gemini-1.5-flash (2.5 does not exist)
    for (const model of ["gemini-1.5-flash", "gemini-1.5-pro"]) {
      try {
        const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt + " Respond in valid JSON." }] }] }),
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } catch (err) { console.error(`${model} Fallback Triggered`); }
    }
  }

  return null;
}

export async function POST(req) {
  try {
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck;

    const body = await req.json();
    const validation = validateRequestBody(body, examGenerateSchema);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });

    const { subject, topic, difficulty, questionCount, userId } = validation.data;

    // Modified Prompt to enforce strict JSON and plain text math
    const prompt = `Generate a JSON exam for ${subject}. Topic: ${topic}. Difficulty: ${difficulty}. Question count: ${questionCount}. 
    Return format: {"questions": [{"id": 1, "type": "multiple_choice", "question": "...", "options": ["A)","B)","C)","D)"], "marks": 1}]}. 
    Use plain text for math, no LaTeX.`;

    const text = await callAI(prompt, userId);
    if (!text) throw new Error("All AI providers failed or timed out.");

    // Robust JSON extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch[0]);

    // Database storage (Keep your existing Supabase logic here...)
    // ... 

    return NextResponse.json({ questions: data.questions, metadata: { subject, topic } });

  } catch (err) {
    console.error("Critical Route Failure:", err.message);
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again." }, { status: 500 });
  }
}