import { NextRequest, NextResponse } from "next/server";

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

async function callGemini(prompt: string): Promise<string | null> {
  for (const model of GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 100, temperature: 0.3 },
          }),
        }
      );
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return text;
    } catch (err) {
      console.error(`Gemini ${model} failed:`, err);
    }
  }

  // Fallback to OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://shadecodestudent.vercel.app",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 100,
        }),
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch (err) {
      console.error("OpenRouter fallback failed:", err);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle both payload formats
    let snapshot = null;
    let events = [];

    if (body.payload) {
      // New format from Cortex component
      snapshot = body.payload.snapshot;
      events = body.payload.events || [];
    } else if (body.behaviorSummary) {
      // Legacy format
      const insight = await callGemini(`You are Cortex, a behavioral interpretation layer inside Shadecode Student.
Output exactly ONE complete sentence (8-20 words). Neutral observation about study behavior only.
Rules: Never motivate, encourage, ask questions, or give advice. Sound like a system.
Student data: ${body.behaviorSummary}`);
      return NextResponse.json({ insight });
    }

    if (!snapshot) {
      return NextResponse.json({ insight: null });
    }

    // Build behavior summary from snapshot
    const {
      streak = 0,
      level = 1,
      xp = 0,
      totalTasks = 0,
      completedTasks = 0,
      pendingTasks = 0,
      subjects = [],
      recentTaskTitles = [],
    } = snapshot;

    const completionRate = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    const eventSummary = events.length > 0
      ? `Recent events: ${events.map((e: any) => e.type).join(", ")}.`
      : "No recent events.";

    const behaviorSummary = `
Streak: ${streak} days
Level: ${level} | XP: ${xp}
Tasks: ${completedTasks}/${totalTasks} completed (${completionRate}% rate)
Pending: ${pendingTasks}
Subjects: ${subjects.length > 0 ? subjects.join(", ") : "none"}
Recent tasks: ${recentTaskTitles.length > 0 ? recentTaskTitles.slice(0, 3).join(", ") : "none"}
${eventSummary}
    `.trim();

    const prompt = `You are Cortex, a behavioral interpretation layer inside Shadecode Student.
Output exactly ONE complete sentence (8-20 words). Neutral observation about the student's study behavior only.
Rules:
- Always output a complete sentence, never a fragment
- Never motivate or encourage
- Never ask questions  
- Never give advice
- Neutral, analytical tone only
- Sound like a system, not a chatbot
- Reference specific data points when possible

Examples:
"Consistency improving over last 3 sessions."
"Single subject focus detected with full task completion."
"Task completion rate stands at ${completionRate}% across ${subjects.length} subjects."
"Study streak now spans ${streak} consecutive active days."

Student behavioral data:
${behaviorSummary}`;

    const insight = await callGemini(prompt);

    if (!insight) {
      return NextResponse.json({ insight: null });
    }

    return NextResponse.json({ insight });
  } catch (err) {
    console.error("Cortex route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
