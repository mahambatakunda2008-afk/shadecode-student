import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExam } from "@/lib/cortex/examGenerator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const topics = Array.isArray(body?.topics) ? body.topics.filter((topic: unknown): topic is string => typeof topic === "string" && topic.trim().length > 0) : [];
    const difficulty = body?.difficulty === "easy" || body?.difficulty === "hard" ? body.difficulty : "medium";
    const questionCount = Number.isFinite(Number(body?.questionCount)) ? Math.max(1, Math.min(20, Math.round(Number(body.questionCount)))) : 10;

    if (!subject) return NextResponse.json({ error: "A subject is required" }, { status: 400 });
    if (body?.topics !== undefined && !Array.isArray(body.topics)) return NextResponse.json({ error: "topics must be an array" }, { status: 400 });

    const exam = await generateExam(subject, topics, difficulty, questionCount, user.id);
    if (!exam) {
      return NextResponse.json({ error: "Cortex could not produce enough verified exam questions right now. No low-quality fallback was used. Please retry." }, { status: 503 });
    }

    return NextResponse.json({ exam });
  } catch (err) {
    console.error("[API /cortex/generate-exam]", err);
    return NextResponse.json({ error: "Failed to generate exam" }, { status: 500 });
  }
}
