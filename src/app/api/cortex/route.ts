import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

const MEMORY_PATH = path.join(process.cwd(), "data", "cortex-memory.json");

/* ---------------- MEMORY ---------------- */

type CortexMemory = {
  weakSubjects: string[];
  strongSubjects: string[];
  focusHistory: number[];
  trend: "improving" | "declining" | "stable";
};

function getDefaultMemory(): CortexMemory {
  return {
    weakSubjects: [],
    strongSubjects: [],
    focusHistory: [],
    trend: "stable",
  };
}

function readMemory(userId: string): CortexMemory {
  try {
    if (!fs.existsSync(MEMORY_PATH)) return getDefaultMemory();

    const raw = JSON.parse(fs.readFileSync(MEMORY_PATH, "utf-8"));
    return raw[userId] || getDefaultMemory();
  } catch {
    return getDefaultMemory();
  }
}

function writeMemory(userId: string, memory: CortexMemory) {
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

/* ---------------- TREND ---------------- */

function getTrend(history: number[]) {
  if (!history || history.length < 3) return "stable";

  const recent = history.slice(-3);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;

  if (avg > 75) return "improving";
  if (avg < 40) return "declining";
  return "stable";
}

/* ---------------- AUTOPILOT ---------------- */

function autopilot(memory: CortexMemory) {
  const focus = memory.focusHistory.slice(-3);
  const avg =
    focus.length > 0
      ? focus.reduce((a, b) => a + b, 0) / focus.length
      : 50;

  if (memory.trend === "declining" && avg < 45) {
    return {
      recommendation: "warn",
      message: "Performance decline detected. Recovery recommended.",
      priority: "high",
    };
  }

  if (avg > 80) {
    return {
      recommendation: "focus",
      message: "High efficiency detected. Deep focus recommended.",
      priority: "medium",
    };
  }

  if (memory.weakSubjects.length > 0) {
    return {
      recommendation: "revise",
      message: `Focus revision on ${memory.weakSubjects[0]}.`,
      priority: "medium",
    };
  }

  return {
    recommendation: "plan",
    message: "Balanced state. Continue structured study.",
    priority: "low",
  };
}

/* ---------------- AI ENGINE ---------------- */

async function callAI(prompt: string): Promise<string | null> {
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
        }),
      }
    );

    const data = await res.json();
    return data?.result?.response || null;
  } catch {
    return null;
  }
}

/* ---------------- ROUTE ---------------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || "default";

    let memory = readMemory(userId);

    const isCommand = body.type === "command";

    let behaviorSummary = "";

    /* ---------------- SNAPSHOT ---------------- */

    if (body.payload?.snapshot) {
      const s = body.payload.snapshot;

      const rate =
        s.totalTasks > 0
          ? Math.round((s.completedTasks / s.totalTasks) * 100)
          : 0;

      memory.focusHistory = [...memory.focusHistory.slice(-6), rate];
      memory.trend = getTrend(memory.focusHistory);

      memory.weakSubjects = s.subjects?.slice(0, 2) || [];
      memory.strongSubjects = s.subjects?.slice(2, 4) || [];

      writeMemory(userId, memory);

      behaviorSummary = `Tasks ${rate}%, Streak ${s.streak}, XP ${s.xp}`;
    } else {
      behaviorSummary = body.behaviorSummary || "";
    }

    const auto = autopilot(memory);

    /* ---------------- PROMPT ---------------- */

    let prompt = "";

    if (isCommand) {
      prompt = `
You are Cortex Command Engine.

Return ONLY JSON:
{ "action": "focus | task | learn | exam | navigate" }

Input:
${body.input}
`;
    } else {
      prompt = `
You are Cortex.

Return ONE sentence only (8–20 words).

Memory:
Weak: ${memory.weakSubjects.join(", ")}
Strong: ${memory.strongSubjects.join(", ")}
Trend: ${memory.trend}
Focus: ${memory.focusHistory.slice(-5).join(", ")}

Behavior:
${behaviorSummary}
`;
    }

    const result = await callAI(prompt);

    /* ---------------- COMMAND ---------------- */

    if (isCommand) {
      try {
        const cleaned = result?.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned || "{}");

        return NextResponse.json({
          ...parsed,
          autopilot: auto,
        });
      } catch {
        return NextResponse.json({
          action: "navigate",
          autopilot: auto,
        });
      }
    }

    /* ---------------- OBSERVATION ---------------- */

    return NextResponse.json({
      insight: result?.trim() || null,
      memory,
      autopilot: auto,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
