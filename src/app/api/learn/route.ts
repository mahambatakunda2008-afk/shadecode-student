import { NextResponse } from "next/server";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

async function callAI(prompt: string, maxTokens = 2500): Promise<string | null> {
  // 1. Cloudflare
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
            max_tokens: maxTokens,
          }),
        }
      );

      const data = await res.json();

      const text =
        typeof data?.result?.response === "string"
          ? data.result.response
          : JSON.stringify(data?.result?.response || "");

      if (text) return text;
    } catch (err) {
      console.error("Cloudflare failed:", err);
    }
  }

  // 2. OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxTokens,
          }),
        }
      );

      const data = await res.json();
      return data?.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error("OpenAI failed:", err);
    }
  }

  // 3. Gemini fallback
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
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
            }),
          }
        );

        const data = await res.json();

        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) return text;
      } catch (err) {
        console.error(`Gemini ${model} failed:`, err);
      }
    }
  }

  return null;
}

// 🧠 CORE LESSON PROMPT (REAL STRUCTURED PEDAGOGY)
function lessonPrompt(subject: string, topic: string) {
  return `
You are an expert ${subject} tutor teaching an A-Level student.

Teach: "${topic}"

Return ONLY valid JSON. No markdown. No explanation outside JSON.

The lesson MUST follow this structure:

{
  "topic": "${topic}",
  "subject": "${subject}",
  "blocks": [
    {
      "type": "intro",
      "title": "What you are learning",
      "content": ""
    },
    {
      "type": "concept",
      "title": "Key Idea",
      "content": ""
    },
    {
      "type": "concept",
      "title": "How it works",
      "content": ""
    },
    {
      "type": "example",
      "title": "Worked Example",
      "content": ""
    },
    {
      "type": "mistake",
      "title": "Common Mistakes",
      "content": ""
    },
    {
      "type": "reflection",
      "title": "Think About It",
      "content": ""
    }
  ]
}

STRICT RULES:
- NO LaTeX
- Use simple math like x^2, not symbols
- Each block must be short (2–6 sentences)
- Must feel like a real tutor teaching step-by-step
- Include at least 1 example with numbers where relevant
- Avoid fluff or repetition
`;
}

function quizPrompt(subject: string, topic: string) {
  return `
Create 5 A-Level MCQs for:

Subject: ${subject}
Topic: ${topic}

Return ONLY JSON:

{
  "questions": [
    {
      "question": "",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": ""
    }
  ]
}

Rules:
- NO LaTeX
- Test understanding, not memory
- Make distractors realistic
`;
}

// 🧠 SAFE JSON PARSER
function extractJSON(text: string) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, subject, topic } = body;

    if (!type || !subject || !topic) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    // 📘 LESSON MODE (MAIN FEATURE)
    if (type === "lesson") {
      const prompt = lessonPrompt(subject, topic);

      const raw = await callAI(prompt);

      if (!raw) {
        return NextResponse.json({
          topic,
          subject,
          blocks: [
            {
              type: "mistake",
              title: "Error",
              content:
                "AI failed to generate lesson. Try again.",
            },
          ],
        });
      }

      const json = extractJSON(raw);

      if (!json?.blocks) {
        return NextResponse.json({
          topic,
          subject,
          blocks: [
            {
              type: "warning",
              title: "Parsing Error",
              content:
                "AI response was invalid. Try again.",
            },
          ],
        });
      }

      return NextResponse.json(json);
    }

    // 🧪 QUIZ MODE
    if (type === "quiz") {
      const prompt = quizPrompt(subject, topic);

      const raw = await callAI(prompt);

      if (!raw) {
        return NextResponse.json({ questions: [] });
      }

      const json = extractJSON(raw);

      if (!json?.questions) {
        return NextResponse.json({ questions: [] });
      }

      return NextResponse.json(json);
    }

    return NextResponse.json(
      { error: "Invalid type" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Learn API error:", err);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
