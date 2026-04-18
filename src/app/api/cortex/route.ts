import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { behaviorSummary } = await req.json();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      system: `You are Cortex, a behavioral interpretation layer inside a student productivity app called Shadecode Student.
Your job is to analyze student activity data and output ONE short, neutral insight (1-2 sentences max).

Rules:
- Never motivate or encourage
- Never ask questions
- Never give advice
- No emotional language
- Neutral, analytical tone only
- Observe and reflect patterns only
- Sound like a system, not a chatbot

Example outputs:
"Consistency improving over last 3 sessions."
"Engagement concentrated in short bursts."
"High task completion rate detected in Mathematics."
"Irregular activity pattern identified across subjects."`,
      messages: [{ role: "user", content: behaviorSummary }],
    }),
  });

  const data = await response.json();
  const insight = data.content?.[0]?.text?.trim();
  return NextResponse.json({ insight });
}