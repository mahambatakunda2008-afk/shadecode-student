// src/app/api/exam/generate/route.js
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function callAI(prompt) {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
  ].filter(Boolean);

  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

  for (const key of keys) {
    const genAI = new GoogleGenerativeAI(key);
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        console.error(`${modelName} with key ...${key.slice(-4)} failed:`, err.message);
      }
    }
  }

  // OpenRouter fallback
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://shadecodestudent.vercel.app",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error("OpenRouter failed:", err.message);
    }
  }

  return null;
}

export async function POST(req) {
  try {
    const { subject, topic, difficulty, questionCount } = await req.json();

    const prompt = `You are an expert ${subject} examiner generating an exam paper.

Generate exactly ${questionCount} exam questions for:
- Subject: ${subject}
- Topic: ${topic || "mixed topics across the full syllabus"}
- Standard: ${difficulty}

Create a MIX of question types:
- ~40% Multiple choice (4 options each)
- ~30% Short answer (2-4 marks each)  
- ~30% Structured/extended (4-8 marks each)

Respond ONLY with valid JSON, no other text:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "topic": "specific topic name",
      "question": "Question text here",
      "options": ["A) option", "B) option", "C) option", "D) option"],
      "marks": 1
    },
    {
      "id": 2,
      "type": "short_answer",
      "topic": "specific topic name", 
      "question": "Question text here",
      "marks": 3
    },
    {
      "id": 3,
      "type": "structured",
      "topic": "specific topic name",
      "question": "Question text here. Show all working.",
      "marks": 6
    }
  ]
}

Rules:
- Questions must be exam-quality, specific, and answerable
- Vary difficulty within the paper
- Topics must be realistic for ${subject} at ${difficulty}
- Marks should reflect question complexity
- For MCQ, only include options array`;

    const text = await callAI(prompt);

    if (!text) {
      return NextResponse.json(
        { error: "All AI models are currently unavailable. Please try again in a few minutes." },
        { status: 503 }
      );
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Exam generation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
