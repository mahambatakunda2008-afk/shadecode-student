import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
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
        system: `You are Cortex, a behavioral interpretation layer inside a student productivity app.
Output ONE short neutral insight (1-2 sentences). No motivation, no advice, no questions.`,
        messages: [{ role: "user", content: behaviorSummary }],
      }),
    });

    const data = await response.json();
    console.log("Anthropic response:", JSON.stringify(data));
    const insight = data.content?.[0]?.text?.trim();
    return NextResponse.json({ insight });
  } catch (err) {
    console.error("Cortex route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}