import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { behaviorSummary } = await req.json();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are Cortex, a behavioral interpretation layer inside a student productivity app called Shadecode Student.
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
"Irregular activity pattern identified across subjects."

Student behavioral data:
${behaviorSummary}`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.3,
          },
        }),
      }
    );

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data));

    const insight = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!insight) {
      console.error("No insight returned:", JSON.stringify(data));
      return NextResponse.json({ insight: null, debug: data });
    }

    return NextResponse.json({ insight });

  } catch (err) {
    console.error("Cortex route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}