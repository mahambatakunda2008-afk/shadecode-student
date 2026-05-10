import { NextRequest, NextResponse } from "next/server";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

type CortexMemory = {
  weakSubjects: string[];
  strongSubjects: string[];
  lastTrend: "improving" | "declining" | "stable";
  focusScore: number;
};

async function callAI(prompt: string): Promise<string | null> {
  // 🟣 Cloudflare (fast edge brain)
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
            max_tokens: 150,
          }),
        }
      );

      const data = await res.json();
      const text = data?.result?.response;
      if (text) return text;
    } catch (err) {
      console.error("Cloudflare failed:", err);
    }
  }

  // 🟢 OpenAI fallback
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
          max_tokens: 150,
        }),
      });

      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error("OpenAI failed:", err);
    }
  }

  // 🔵 Gemini fallback
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
  ].filter(Boolean) as string[];

  for (const key of geminiKeys) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 150,
              temperature: 0.3,
            },
          }),
        }
      );

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) {
      console.error("Gemini failed:", err);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let memory: CortexMemory | null = null;
    let behaviorSummary = "";

    // 🧠 MEMORY BUILDER
    if (body.payload?.snapshot) {
      const s = body.payload.snapshot;

      const rate =
        s.totalTasks > 0
          ? Math.round((s.completedTasks / s.totalTasks) * 100)
          : 0;

      const weakSubjects =
        s.subjects?.filter((_: string, i: number) => i % 2 === 0) || [];

      const strongSubjects =
        s.subjects?.filter((_: string, i: number) => i % 2 === 1) || [];

      const trend =
        rate > 75 ? "improving" : rate < 40 ? "declining" : "stable";

      memory = {
        weakSubjects,
        strongSubjects,
        lastTrend: trend,
        focusScore: rate,
      };

      behaviorSummary = `Streak: ${s.streak} days, Level: ${s.level}, XP: ${s.xp}, Tasks: ${s.completedTasks}/${s.totalTasks} (${rate}%), Subjects: ${s.subjects?.join(", ") || "none"}`;
    } else {
      behaviorSummary = body.behaviorSummary || "";
    }

    if (!behaviorSummary && !body.input) {
      return NextResponse.json({ insight: null });
    }

    const isCommandRequest =
      body.type === "command" || body.payload?.intentMode === "command";

    // 🧠 PROMPT ENGINE
    let prompt = "";

    if (isCommandRequest) {
      prompt = `
You are Cortex Command Engine inside Shadecode Student.

Memory awareness enabled but DO NOT mention it.

Convert user input into structured action.

Return ONLY JSON:

Allowed actions:
- focus
- task
- learn
- exam
- navigate

Rules:
- No explanation
- No extra text
- Only JSON

Input:
${body.input || ""}
`;
    } else {
      prompt = `
You are Cortex, a behavioral intelligence system inside Shadecode Student.

Return exactly ONE sentence (8–20 words).
No advice. No motivation. No questions.

Memory:
- Weak subjects: ${memory?.weakSubjects?.join(", ") || "unknown"}
- Strong subjects: ${memory?.strongSubjects?.join(", ") || "unknown"}
- Trend: ${memory?.lastTrend || "unknown"}
- Focus score: ${memory?.focusScore ?? "unknown"}%

User data:
${behaviorSummary}

Examples:
"Math performance declining with inconsistent task completion."
"Focus score stable with balanced subject distribution."
"Strong consistency observed in revision patterns."
`;
    }

    const result = await callAI(prompt);
    if (!result) return NextResponse.json({ insight: null });

    // 🧭 COMMAND MODE OUTPUT
    if (isCommandRequest) {
      try {
        const cleaned = result.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        // light intelligence bias
        if (
          parsed.action === "learn" &&
          memory?.lastTrend === "declining"
        ) {
          parsed.priority = "high";
        }

        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({ action: "navigate" });
      }
    }

    // 📊 OBSERVATION MODE OUTPUT
    return NextResponse.json({
      insight: result.trim(),
      memory,
    });
  } catch (err) {
    console.error("Cortex route error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
