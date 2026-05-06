import { NextResponse } from "next/server";

async function callAI(prompt: string): Promise<string | null> {
  // OpenAI first
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    } catch (err) {
      console.error("OpenAI failed:", err);
    }
  }

  // Gemini fallback
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean) as string[];

  for (const key of geminiKeys) {
    for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } catch (err) {
        console.error(`Gemini ${model} failed:`, err);
      }
    }
  }

  // OpenRouter fallback
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://shadecodestudent.vercel.app",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error("OpenRouter failed:", err);
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, subject, topic } = body;

    if (type === "explanation") {
      const prompt = `You are an expert ${subject} teacher explaining a topic to an A-Level student.

Explain the topic: "${topic}" in ${subject}

Structure your explanation clearly:
1. Start with a simple overview (2-3 sentences)
2. Explain the key concepts step by step
3. Give a worked example if applicable
4. Mention common mistakes to avoid

Write in clear, plain English. No LaTeX. Use simple math notation like x^2 instead of $x^2$.
Length: 300-400 words.`;

      const text = await callAI(prompt);
      if (!text) return NextResponse.json({ explanation: "AI is currently unavailable. Please try again." });
      return NextResponse.json({ explanation: text });
    }

    if (type === "quiz") {
      const prompt = `You are an expert ${subject} teacher creating practice questions about "${topic}".

Generate exactly 4 multiple choice questions at A-Level standard.

Respond ONLY with valid JSON, no other text:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}

Rules:
- correct is the index (0-3) of the correct option
- Questions must test understanding, not just recall
- Write math in plain text: x^2 not LaTeX
- Make options plausible, not obviously wrong`;

      const text = await callAI(prompt);
      if (!text) return NextResponse.json({ questions: [] });

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON");
        const data = JSON.parse(jsonMatch[0]);
        return NextResponse.json(data);
      } catch {
        return NextResponse.json({ questions: [] });
      }
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("Learn API error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
