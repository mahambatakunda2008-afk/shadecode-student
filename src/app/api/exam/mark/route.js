// src/app/api/exam/mark/route.js
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function callAI(prompt) {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.error(`${modelName} failed:`, err.message);
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
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
    return data.choices?.[0]?.message?.content;
  }

  throw new Error("All AI models failed");
}

function getGrade(percentage) {
  if (percentage >= 90) return "A*";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "U";
}

export async function POST(req) {
  try {
    const { subject, difficulty, questions, answers, timeTaken } = await req.json();

    const qaText = questions.map((q, i) => {
      const answer = answers.find(a => a.questionId === q.id);
      return `Q${i + 1} [${q.type}, ${q.marks} marks, topic: ${q.topic}]:
Question: ${q.question}
${q.options ? `Options: ${q.options.join(", ")}` : ""}
Student answer: ${answer?.answer || "(no answer)"}
Time spent: ${answer?.timeSpent || 0}s`;
    }).join("\n\n");

    const prompt = `You are an expert ${subject} examiner marking an exam paper.

Subject: ${subject}
Standard: ${difficulty}

QUESTIONS AND STUDENT ANSWERS:
${qaText}

Mark each question fairly and provide detailed feedback. 
Respond ONLY with valid JSON:
{
  "results": [
    {
      "questionId": 1,
      "score": 1,
      "maxScore": 1,
      "correct": true,
      "feedback": "Brief explanation of marking",
      "modelAnswer": "The correct answer",
      "topic": "topic name"
    }
  ],
  "weakAreas": ["topic1", "topic2"],
  "strongAreas": ["topic3"],
  "cortexInsight": "2-3 neutral sentences about the student's performance patterns across this exam. Reference specific topics and question types. Do not encourage or discourage — purely analytical."
}

Rules:
- Award partial marks for structured questions where working is partially correct
- For MCQ: full marks or zero only
- weakAreas: topics where student scored below 50%
- strongAreas: topics where student scored 80%+
- cortexInsight must be neutral and analytical, not motivational`;

    const text = await callAI(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const markingData = JSON.parse(jsonMatch[0]);

    // Calculate totals
    const totalScore = markingData.results.reduce((sum, r) => sum + (r.score || 0), 0);
    const maxScore = questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    return NextResponse.json({
      ...markingData,
      totalScore,
      maxScore,
      percentage,
      grade: getGrade(percentage),
      timeTaken,
    });
  } catch (err) {
    console.error("Marking error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
