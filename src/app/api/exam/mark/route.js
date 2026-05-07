// src/app/api/exam/mark/route.js
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
      const text = data?.result?.response;
      if (text) { console.log("Cloudflare success"); return text; }
    } catch (err) { console.error("Cloudflare failed:", err); }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 3000, temperature: 0.3 }),
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

function getGrade(percentage) {
  if (percentage >= 90) return "A*";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "U";
}

export async function POST(req) {
  try {
    const { subject, difficulty, questions, answers, timeTaken } = await req.json();

    const qaText = questions.map((q, i) => {
      const answer = answers.find(a => a.questionId === q.id);
      return `Q${i + 1} [${q.type}, ${q.marks} marks, topic: ${q.topic}]:
Question: ${q.question}
${q.options ? `Options: ${q.options.join(", ")}` : ""}
Student answer: ${answer?.answer || "(no answer)"}
Time spent: ${answer?.timeSpent || 0}s`;
    }).join("\n\n");

    const prompt = `You are an expert ${subject} examiner marking an exam paper.
Subject: ${subject}, Standard: ${difficulty}

QUESTIONS AND STUDENT ANSWERS:
${qaText}

Mark each question and respond ONLY with valid JSON:
{
  "results": [
    {
      "questionId": 1,
      "score": 1,
      "maxScore": 1,
      "correct": true,
      "feedback": "Brief marking explanation",
      "modelAnswer": "The correct answer",
      "topic": "topic name"
    }
  ],
  "weakAreas": ["topic1", "topic2"],
  "strongAreas": ["topic3"],
  "cortexInsight": "2-3 neutral analytical sentences about performance patterns. No motivation."
}

Rules:
- Partial marks for structured questions with partial working
- MCQ: full marks or zero only
- weakAreas: topics below 50%, strongAreas: topics above 80%`;

    const text = await callAI(prompt);
    if (!text) return NextResponse.json({ error: "All AI models unavailable." }, { status: 503 });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const markingData = JSON.parse(jsonMatch[0]);
    const totalScore = markingData.results.reduce((sum, r) => sum + (r.score || 0), 0);
    const maxScore = questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    return NextResponse.json({ ...markingData, totalScore, maxScore, percentage, grade: getGrade(percentage), timeTaken });
  } catch (err) {
    console.error("Marking error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
