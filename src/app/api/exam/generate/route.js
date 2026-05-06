// src/app/api/exam/generate/route.js
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export async function POST(req) {
  try {
    const body = await req.json();
    const { prompt } = body;

    // --- Primary: Gemini ---
    try {
      const genAI = new GoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY, // make sure this matches your Vercel variable name
      });

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);

      return NextResponse.json({
        exam: result.response.text(),
        source: "gemini",
      });
    } catch (geminiError) {
      console.warn("Gemini failed, falling back to OpenAI:", geminiError.message);
    }

    // --- Fallback: OpenAI ---
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or "gpt-4-turbo" if you prefer
      messages: [{ role: "user", content: prompt }],
    });

    return NextResponse.json({
      exam: completion.choices[0].message.content,
      source: "openai",
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Exam generation failed" },
      { status: 500 }
    );
  }
}
