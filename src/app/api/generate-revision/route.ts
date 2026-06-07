import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { content, topic } = await req.json();

  const prompt = `
You are a study assistant.

Convert this lesson into structured revision data.

Return ONLY valid JSON in this format:

{
  "summary": "",
  "flashcards": [
    { "q": "", "a": "" }
  ],
  "questions": [
    ""
  ]
}

Topic: ${topic}

Content:
${content}
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();

  const output = data.choices?.[0]?.message?.content;

  return NextResponse.json(JSON.parse(output));
}
