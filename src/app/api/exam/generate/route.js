import { NextResponse } from "next/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examGenerateSchema, validateRequestBody } from "@/lib/validation/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai";

export async function POST(req) {
  try {
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck;

    const body = await req.json();
    const validation = validateRequestBody(body, examGenerateSchema);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });

    const { subject, topic, difficulty, questionCount, userId } = validation.data;

    // Modified Prompt to enforce strict JSON and plain text math
    const prompt = `Generate a JSON exam for ${subject}. Topic: ${topic}. Difficulty: ${difficulty}. Question count: ${questionCount}. 
    Return format: {"questions": [{"id": 1, "type": "multiple_choice", "question": "...", "options": ["A)","B)","C)","D)"], "marks": 1}]}. 
    Use plain text for math, no LaTeX.`;

    const text = await callAI(prompt, 6000, { userId, feature: "exam_sim", subfeature: "generate_exam" });
    if (!text) throw new Error("All AI providers failed or timed out.");

    // Robust JSON extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch[0]);

    // Database storage (Keep your existing Supabase logic here...)
    // ... 

    return NextResponse.json({ questions: data.questions, metadata: { subject, topic } });

  } catch (err) {
    console.error("Critical Route Failure:", err.message);
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again." }, { status: 500 });
  }
}
