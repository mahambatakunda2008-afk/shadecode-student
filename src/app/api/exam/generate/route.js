import { NextResponse } from "next/server";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { examGenerateSchema, validateRequestBody } from "@/lib/validation/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { callAI } from "@/lib/ai";

export const runtime = 'edge'; // Massive performance boost

export async function POST(req) {
  try {
    const rateLimitCheck = await applyRateLimit(req, aiEndpointLimiter);
    if (rateLimitCheck) return rateLimitCheck;

    const body = await req.json();
    const validation = validateRequestBody(body, examGenerateSchema);
    if (!validation.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });

    const { subject, topic, difficulty, questionCount, userId } = validation.data;

    const prompt = `You are an expert ${subject} examiner. Generate exactly ${questionCount} questions in JSON format.
    Structure: {"questions": [{"id": 1, "type": "multiple_choice", "question": "...", "options": ["A)","B)","C)","D)"], "marks": 1}]}.
    Difficulty: ${difficulty}. Topic: ${topic}. Use plain text for math, no LaTeX. Respond ONLY with JSON.`;

    const text = await callAI(prompt, 6000, { userId, feature: "exam_sim", subfeature: "generate_exam" });
    if (!text) return NextResponse.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const json = JSON.parse(jsonMatch[0]);

    // Background save (don't await, keep response fast)
    if (userId) {
      createSupabaseServerClient().then(supabase => {
        supabase.from('exams').insert({
          user_id: userId, subject, difficulty, questions: json.questions
        }).then(() => console.log("Exam Saved"));
      });
    }

    return NextResponse.json({ questions: json.questions, metadata: { subject, topic } });
  } catch (err) {
    console.error("Critical Route Failure:", err.message);
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again." }, { status: 500 });
  }
}
