import { NextResponse } from "next/server";

const cache = new Map<string, any>();

function normalize(input: string) {
  return input.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

function fetchWithTimeout(url: string, options: any, timeout = 8000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), timeout)
    )
  ]);
}

// ===================== GEMINI =====================
async function callGemini(prompt: string) {
  const res: any = await fetchWithTimeout(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": process.env.GEMINI_API_KEY!
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!res.ok) throw new Error(`Gemini failed: ${res.status}`);

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ===================== OPENAI =====================
async function callOpenAI(prompt: string) {
  const res: any = await fetchWithTimeout(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      })
    }
  );

  if (!res.ok) throw new Error(`OpenAI failed: ${res.status}`);

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ===================== OPENROUTER =====================
async function callOpenRouter(prompt: string) {
  const res: any = await fetchWithTimeout(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300
      })
    }
  );

  if (!res.ok) throw new Error(`OpenRouter failed: ${res.status}`);

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// ===================== PARSER =====================
function safeJSONParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ===================== MAIN ROUTE =====================
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const type = body.type || "explanation";
    const subject = body.subject || "General";
    const topic = body.topic || "";

    if (!topic) {
      return NextResponse.json({
        error: "No topic provided"
      });
    }

    const key = normalize(`${type}-${subject}-${topic}`);

    // 🧊 CACHE
    if (cache.has(key)) {
      return NextResponse.json({
        ...cache.get(key),
        source: "cache"
      });
    }

    let raw = "";

    // ===================== EXPLANATION =====================
    if (type === "explanation") {
      const prompt = `Explain "${topic}" in ${subject} in a clear, student-friendly way.`;

      try {
        raw = await callGemini(prompt);
      } catch {
        try {
          raw = await callOpenAI(prompt);
        } catch {
          raw = await callOpenRouter(prompt);
        }
      }

      const result = {
        explanation: raw || "Unable to generate explanation."
      };

      cache.set(key, result);

      return NextResponse.json(result);
    }

    // ===================== QUIZ =====================
    if (type === "quiz") {
      const prompt = `
Create 5 multiple choice questions about "${topic}" in ${subject}.

Return ONLY valid JSON in this format:
{
  "questions": [
    {
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "string"
    }
  ]
}
      `;

      try {
        raw = await callGemini(prompt);
      } catch {
        try {
          raw = await callOpenAI(prompt);
        } catch {
          raw = await callOpenRouter(prompt);
        }
      }

      const parsed = safeJSONParse(raw);

      const result = {
        questions: parsed?.questions || []
      };

      cache.set(key, result);

      return NextResponse.json(result);
    }

    // ===================== FALLBACK =====================
    return NextResponse.json({
      error: "Invalid type"
    });

  } catch (err) {
    console.error("Learn API fatal error:", err);

    return NextResponse.json({
      error: "Something went wrong"
    });
  }
}
