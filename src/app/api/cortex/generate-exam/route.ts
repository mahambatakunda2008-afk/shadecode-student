import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExam } from "@/lib/cortex/examGenerator";
import { resolveCurriculum } from "@/lib/curriculum/resolver";
import { getLearnerContextForUser } from "@/lib/learner/serverContext";

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

    const learner = await getLearnerContextForUser(supabase, user);
    if (!learner) return NextResponse.json({ error: "Your academic profile is incomplete. Finish onboarding before generating an exam." }, { status: 409 });

    const requestedTopic = topics[0];
    const curriculum = resolveCurriculum(learner, subject, requestedTopic);
    if (!curriculum) return NextResponse.json({ error: "That subject is outside your enrolled academic scope." }, { status: 403 });

    const exam = await generateExam(subject, topics, difficulty, questionCount, user.id);
    if (!exam) return NextResponse.json({ error: "Cortex could not produce enough verified exam questions right now. Please retry." }, { status: 503 });

    return NextResponse.json({ exam, curriculum });
  } catch (err) {
    console.error("[API /cortex/generate-exam]", err);
    return NextResponse.json({ error: "Failed to generate exam" }, { status: 500 });
  }
}
