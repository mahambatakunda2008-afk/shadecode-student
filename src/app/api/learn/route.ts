import { NextResponse } from "next/server";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

async function callAI(prompt: string, maxTokens = 2000): Promise<string | null> {
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
      return typeof data?.result?.response === "string"
        ? data.result.response
        : JSON.stringify(data?.result?.response || "");
    } catch (err) {
      console.error("Cloudflare failed:", err);
    }
  }

  // 2. OpenAI
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
          max_tokens: maxTokens,
        }),
      });

      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error("OpenAI failed:", err);
    }
  }

  return null;
}

/**
 * 🧠 CORE IDEA:
 * We force the AI to output STRUCTURED LESSON BLOCKS
 */
function buildLessonPrompt(subject: string, topic: string) {
  return `
You are an expert ${subject} teacher creating a structured A-Level lesson.

Topic: "${topic}"

Return ONLY valid JSON in this format:

{
  "title": "string",
  "blocks": [
    {
      "type": "text",
      "content": "clear explanation"
    },
    {
      "type": "example",
      "content": "worked example step-by-step"
    },
    {
      "type": "math",
      "content": "LaTeX equation ONLY"
    },
    {
      "type": "tip",
      "content": "important exam tip"
    }
  ]
}

RULES:
- Use SIMPLE, clear English
- Break explanations into small steps
- Include at least:
  - 2 text blocks
  - 1 example
  - 1 math block (use LaTeX)
  - 1 tip block
- Math MUST be valid LaTeX (e.g. x^2 - 5x + 6 = 0)
- Do NOT include markdown
- Do NOT include commentary
- Output ONLY JSON
`;
}

function safeParseJSON(text: string) {
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

    if (type !== "lesson") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const prompt = buildLessonPrompt(subject, topic);

    const raw = await callAI(prompt);

    if (!raw) {
      return NextResponse.json({
        title: "Unavailable",
        blocks: [
          {
            type: "text",
            content: "AI is currently unavailable. Please try again.",
          },
        ],
      });
    }

    const parsed = safeParseJSON(raw);

    if (!parsed || !parsed.blocks) {
      return NextResponse.json({
        title: topic,
        blocks: [
          {
            type: "text",
            content: "Failed to generate structured lesson. Try again.",
          },
        ],
      });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Learn API error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
