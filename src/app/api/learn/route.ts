import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { type, subject, topic } = await req.json();

    let prompt = "";

    if (type === "explanation") {
      prompt = `You are an expert tutor helping a high school student (A-Level / ZIMSEC level) understand ${subject}.

Explain the topic: "${topic}"

Rules:
- Clear, simple language suitable for A-Level students
- Use examples where helpful
- Structure with short paragraphs
- Maximum 300 words
- No markdown formatting, just plain text`;
    } else {
      prompt = `You are an expert tutor creating a practice quiz for a high school student (A-Level / ZIMSEC level) studying ${subject}.

Create exactly 4 multiple choice questions about: "${topic}"

You MUST respond with ONLY valid JSON in this exact format, nothing else:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Brief explanation of why this is correct."
    }
  ]
}

Rules:
- correct is the index (0-3) of the correct option
- All 4 questions must be about ${topic}
- Make questions appropriate for A-Level level
- Keep options concise`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.4,
          },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    if (type === "explanation") {
      return NextResponse.json({ explanation: text });
    } else {
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      return NextResponse.json(parsed);
    }

  } catch (err) {
    console.error("Learn route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}