import { NextRequest, NextResponse } from "next/server";

const CF_ACCOUNT = "6a119f6052c02197d301e50f0d4a56cc";

async function callAI(prompt: string): Promise<string | null> {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: 100 }),
        }
      );
      const data = await res.json() as any;
      const text = data?.result?.response;
      if (text) return text;
    } catch (err) { console.error("Cloudflare failed:", err); }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 100 }),
      });
      const data = await res.json() as any;
      return data.choices?.[0]?.message?.content || null;
    } catch (err) { console.error("OpenAI failed:", err); }
  }

  const geminiKeys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(Boolean) as string[];
  for (const key of geminiKeys) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 100, temperature: 0.3 } }),
        }
      );
      const data = await res.json() as any;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (err) { console.error("Gemini failed:", err); }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let behaviorSummary = "";

    if (body.payload?.snapshot) {
      const s = body.payload.snapshot;
      const rate = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
      behaviorSummary = `Streak: ${s.streak} days, Level: ${s.level}, XP: ${s.xp}, Tasks: ${s.completedTasks}/${s.totalTasks} (${rate}%), Subjects: ${s.subjects?.join(", ") || "none"}`;
    } else {
      behaviorSummary = body.behaviorSummary || "";
    }

    if (!behaviorSummary) return NextResponse.json({ insight: null });

    const prompt = `You are Cortex, a behavioral interpretation layer inside Shadecode Student.
Output exactly ONE complete sentence (8-20 words). Neutral observation about study behavior only.
Rules: Never motivate, encourage, ask questions, or give advice. Sound like a system, not a chatbot.
Examples:
"Consistency improving over last 3 sessions."
"Single subject focus detected with full task completion."
"Task completion rate stands at 50% across 3 subjects."

Student data: ${behaviorSummary}`;

    const insight = await callAI(prompt);
    if (!insight) return NextResponse.json({ insight: null });
    return NextResponse.json({ insight: insight.trim() });
  } catch (err) {
    console.error("Cortex route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
