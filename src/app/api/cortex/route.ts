import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { behaviorSummary } = await req.json();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
Analyze the student data and output exactly ONE complete sentence (minimum 8 words, maximum 20 words).
The sentence must be a neutral observation about their study behavior.

Rules:
- Always output a complete sentence, never a fragment
- Never motivate or encourage
- Never ask questions
- Never give advice
- Neutral, analytical tone only
- Sound like a system, not a chatbot

Examples of correct output (complete sentences only):
"Consistency improving across Mathematics and Physics subjects."
"Task completion rate at 40% with active engagement detected."
"Study pattern shows partial progress across multiple subjects."

Student behavioral data:
${behaviorSummary}`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 150,
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