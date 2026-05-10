import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

const MEMORY_PATH = path.join(process.cwd(), "data", "cortex-memory.json");

/* ---------------- MEMORY SYSTEM ---------------- */

function readMemory(userId: string) {
  try {
    if (!fs.existsSync(MEMORY_PATH)) {
      return {
        weakSubjects: [],
        strongSubjects: [],
        focusHistory: [],
        trend: "stable",
      };
    }

    const raw = fs.readFileSync(MEMORY_PATH, "utf-8");
    const data = JSON.parse(raw);

    return (
      data[userId] || {
        weakSubjects: [],
        strongSubjects: [],
        focusHistory: [],
        trend: "stable",
      }
    );
  } catch {
    return {
      weakSubjects: [],
      strongSubjects: [],
      focusHistory: [],
      trend: "stable",
    };
  }
}

function writeMemory(userId: string, memory: any) {
  try {
    let data: any = {};

    if (fs.existsSync(MEMORY_PATH)) {
      data = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf-8"));
    }

    data[userId] = memory;

    fs.writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Memory write failed:", err);
  }
}

/* ---------------- TREND ENGINE ---------------- */

function getFocusTrend(history: number[]) {
  if (!history || history.length < 3) return "stable";

  const recent = history.slice(-3);
  const older = history.slice(-6, -3);

  const recentAvg =
    recent.reduce((a, b) => a + b, 0) / recent.length;

  const olderAvg =
    older.length > 0
      ? older.reduce((a, b) => a + b, 0) / older.length
      : recentAvg;

  if (recentAvg > olderAvg + 5) return "improving";
  if (recentAvg < olderAvg - 5) return "declining";
  return "stable";
}

/* ---------------- AI FALLBACK ENGINE ---------------- */

async function callAI(prompt: string): Promise<string | null> {
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
            max_tokens: 180,
          }),
        }
      );

      const data = await res.json();
      return data?.result?.response || null;
    } catch (err) {
      console.error("Cloudflare failed:", err);
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
          max_tokens: 180,
        }),
      });

      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error("OpenAI failed:", err);
    }
  }

  // Gemini
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
              maxOutputTokens: 180,
              temperature: 0.3,
            },
          }),
        }
      );

      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (err) {
      console.error("Gemini failed:", err);
    }
  }

  return null;
}

/* ---------------- MAIN ROUTE ---------------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || "default";

    let memory = readMemory(userId);
    let behaviorSummary = "";

    /* ---------------- SNAPSHOT PROCESSING ---------------- */

    if (body.payload?.snapshot) {
      const s = body.payload.snapshot;

      const rate =
        s.totalTasks > 0
          ? Math.round((s.completedTasks / s.totalTasks) * 100)
          : 0;

      const trend =
        rate > 75 ? "improving" : rate < 40 ? "declining" : "stable";

      memory = {
        weakSubjects: s.subjects?.slice(0, 2) || memory.weakSubjects,
        strongSubjects: s.subjects?.slice(2, 4) || memory.strongSubjects,
        focusHistory: [...(memory.focusHistory || []).slice(-6), rate],
        trend,
      };

      memory.trend = getFocusTrend(memory.focusHistory);

      writeMemory(userId, memory);

      behaviorSummary = `Streak: ${s.streak} days, Level: ${s.level}, XP: ${s.xp}, Tasks: ${s.completedTasks}/${s.totalTasks} (${rate}%)`;
    } else {
      behaviorSummary = body.behaviorSummary || "";
    }

    const isCommandRequest =
      body.type === "command" || body.payload?.intentMode === "command";

    if (!behaviorSummary && !body.input) {
      return NextResponse.json({ insight: null });
    }

    /* ---------------- PROMPT ENGINE ---------------- */

    let prompt = "";

    if (isCommandRequest) {
      prompt = `
You are Cortex Command Engine inside Shadecode Student.

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
You are Cortex, a predictive academic intelligence system.

Return ONE sentence (8–20 words).
No advice. No motivation. No questions.

Memory:
- Weak: ${memory.weakSubjects.join(", ") || "unknown"}
- Strong: ${memory.strongSubjects.join(", ") || "unknown"}
- Trend: ${memory.trend}
- Focus history: ${memory.focusHistory.slice(-5).join(", ") || "none"}

Student data:
${behaviorSummary}

Examples:
"Math performance declining with unstable focus patterns."
"Consistent improvement across recent study sessions."
"Balanced subject engagement with stable output."
`;
    }

    const result = await callAI(prompt);
    if (!result) return NextResponse.json({ insight: null });

    /* ---------------- COMMAND MODE ---------------- */

    if (isCommandRequest) {
      try {
        const cleaned = result.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        // predictive priority boost
        if (
          parsed.action === "learn" &&
          memory.trend === "declining"
        ) {
          parsed.priority = "high";
        }

        return NextResponse.json(parsed);
      } catch {
        return NextResponse.json({ action: "navigate" });
      }
    }

    /* ---------------- OBSERVATION MODE ---------------- */

    return NextResponse.json({
      insight: result.trim(),
      memory,
      prediction: memory.trend,
    });
  } catch (err) {
    console.error("Cortex error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
