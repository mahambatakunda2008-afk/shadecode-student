import { NextResponse } from "next/server";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

/* ─────────────────────────────
   AI CALLER (SAFE + FALLBACKS)
───────────────────────────── */
async function callAI(prompt) {
  const tryParse = (text) => {
    if (!text) return null;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  };

  // Cloudflare
  if (process.env.CLOUDFLARE_API_TOKEN) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
            max_tokens: 3000,
          }),
        }
      );

      const data = await res.json();
      const text = data?.result?.response;
      const parsed = tryParse(text);

      if (parsed) return parsed;
    } catch (e) {
      console.error("Cloudflare failed:", e);
    }
  }

  // OpenAI
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
          temperature: 0.3,
        }),
      });

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      const parsed = tryParse(text);

      if (parsed) return parsed;
    } catch (e) {
      console.error("OpenAI failed:", e);
    }
  }

  // Gemini
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean);

  for (const key of geminiKeys) {
    for (const model of ["gemini-2.5-flash", "gemini-2.0-flash"]) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = tryParse(text);

        if (parsed) return parsed;
      } catch (e) {
        console.error(`Gemini ${model} failed:`, e);
      }
    }
  }

  return null;
}

/* ─────────────────────────────
   GRADE SYSTEM
───────────────────────────── */
function getGrade(p) {
  if (p >= 90) return "A*";
  if (p >= 80) return "A";
  if (p >= 70) return "B";
  if (p >= 60) return "C";
  if (p >= 50) return "D";
  if (p >= 40) return "E";
  return "U";
}

/* ─────────────────────────────
   MAIN ROUTE
───────────────────────────── */
export async function POST(req) {
  try {
    const {
      subject,
      difficulty,
      questions,
      answers,
      timeTaken,
    } = await req.json();

    const qaText = questions
      .map((q, i) => {
        const answer = answers.find((a) => a.questionId === q.id);

        return `
Q${i + 1} [${q.type}, ${q.marks} marks, topic: ${q.topic}]
Question: ${q.question}
Options: ${q.options ? q.options.join(", ") : "N/A"}
Student answer: ${answer?.answer || "(no answer)"}
Time spent: ${answer?.timeSpent || 0}s
        `;
      })
      .join("\n");

    const prompt = `
You are an expert ${subject} examiner.

Mark this exam carefully.

Return ONLY valid JSON:

{
  "results": [
    {
      "questionId": 1,
      "score": 0,
      "maxScore": 1,
      "correct": false,
      "feedback": "short explanation",
      "modelAnswer": "correct answer",
      "topic": "topic name"
    }
  ],
  "weakAreas": [],
  "strongAreas": [],
  "cortexInsight": "neutral analysis of performance patterns"
}

Rules:
- MCQ = full or zero only
- Partial marks allowed for structured answers
- weakAreas = topics <50%
- strongAreas = topics >80%

DATA:
${qaText}
`;

    const markingData = await callAI(prompt);

    if (!markingData) {
      return NextResponse.json(
        { error: "All AI models unavailable or invalid response" },
        { status: 503 }
      );
    }

    const results = markingData.results || [];

    const totalScore = results.reduce(
      (sum, r) => sum + (r.score || 0),
      0
    );

    const maxScore = questions.reduce(
      (sum, q) => sum + (q.marks || 0),
      0
    );

    const percentage =
      maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    return NextResponse.json({
      ...markingData,
      totalScore,
      maxScore,
      percentage,
      grade: getGrade(percentage),
      timeTaken,
    });
  } catch (err) {
    console.error("Marking error:", err);

    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
