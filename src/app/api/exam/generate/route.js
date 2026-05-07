// src/app/api/exam/generate/route.js
import { NextResponse } from "next/server";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

async function callAI(prompt) {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: 3000 }),
        }
      );
      const data = await res.json();
      const text = typeof data?.result?.response === "string" 
  ? data.result.response 
  : JSON.stringify(data?.result?.response || "");
      if (text) { console.log("Cloudflare success"); return text; }
    } catch (err) { console.error("Cloudflare failed:", err); }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 3000 }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) { console.log("OpenAI success"); return text; }
    } catch (err) { console.error("OpenAI failed:", err); }
  }

  const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2, process.env.GEMINI_API_KEY_3].filter(Boolean);
  for (const key of geminiKeys) {
    for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) { console.log(`Gemini ${model} success`); return text; }
      } catch (err) { console.error(`Gemini ${model} failed:`, err); }
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://shadecodestudent.vercel.app" },
        body: JSON.stringify({ model: "meta-llama/llama-3.3-70b-instruct:free", messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) { console.error("OpenRouter failed:", err); }
  }

  return null;
}

export async function POST(req) {
  try {
    const { subject, topic, difficulty, questionCount } = await req.json();

    const prompt = `You are an expert ${subject} examiner generating an exam paper.

Generate exactly ${questionCount} exam questions for:
- Subject: ${subject}
- Topic: ${topic || "mixed topics across the full syllabus"}
- Standard: ${difficulty}

Create a MIX of question types:
- ~40% Multiple choice (4 options each)
- ~30% Short answer (2-4 marks each)
- ~30% Structured/extended (4-8 marks each)

Respond ONLY with valid JSON, no other text:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "topic": "specific topic name",
      "question": "Question text here",
      "options": ["A) option", "B) option", "C) option", "D) option"],
      "marks": 1
    },
    {
      "id": 2,
      "type": "short_answer",
      "topic": "specific topic name",
      "question": "Question text here",
      "marks": 3
    },
    {
      "id": 3,
      "type": "structured",
      "topic": "specific topic name",
      "question": "Question text here. Show all working.",
      "marks": 6
    }
  ]
}

Rules:
- Questions must be exam-quality, specific, and answerable
- Vary difficulty within the paper
- Topics must be realistic for ${subject} at ${difficulty}
- Marks should reflect question complexity
- For MCQ, only include options array
- Write all math in plain text not LaTeX`;

    const text = await callAI(prompt);
    if (!text) return NextResponse.json({ error: "All AI models unavailable. Try again shortly." }, { status: 503 });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Exam generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
