import { NextResponse } from "next/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examGenerateSchema, validateRequestBody } from "@/lib/validation/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = 'edge'; // Massive performance boost

async function callAI(prompt) {
  // Chain: OpenAI -> Gemini -> Cloudflare
  // 1. OpenAI (Most reliable for JSON)
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        }),
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
    } catch (e) { console.error("OpenAI failed"); }
  }

  // 2. Gemini (Corrected Model ID)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt + " Output strict JSON." }] }] }),
      });
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (e) { console.error("Gemini failed"); }
  }
  return null;
}

export async function POST(req) {
  try {
    const rateLimit = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimit) return rateLimit;

    const body = await req.json();
    const { subject, topic, difficulty, questionCount, userId } = body;

    const prompt = `You are an expert ${subject} examiner. Generate exactly ${questionCount} questions in JSON format. 
    Structure: {"questions": [{"id": 1, "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "marks": 1}]}.
    Difficulty: ${difficulty}. Topic: ${topic}. Respond ONLY with JSON.`;

    const text = await callAI(prompt);
    if (!text) return NextResponse.json({ error: "AI unavailable" }, { status: 503 });

    const json = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);

    // Background Save (Don't await to keep UI fast)
    if (userId) {
      createSupabaseServerClient().then(supabase => {
        supabase.from('exams').insert({
          user_id: userId, subject, difficulty, questions: json.questions
        }).then(() => console.log("Exam Saved"));
      });
    }

    return NextResponse.json({ questions: json.questions });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}