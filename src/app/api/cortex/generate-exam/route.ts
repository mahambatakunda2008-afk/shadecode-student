import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExam } from "@/lib/cortex/examGenerator";
import { resolveCurriculum } from "@/lib/curriculum/resolver";
import type { LearnerContext } from "@/lib/learner/context";

export const dynamic = "force-dynamic";

async function getLearnerContext(request: Request): Promise<LearnerContext | null> {
  const response = await fetch(new URL("/api/learner/context", request.url), {
    method: "GET",
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<LearnerContext>;
}

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

    const learner = await getLearnerContext(request);
    if (!learner) return NextResponse.json({ error: "Your academic profile is incomplete. Finish onboarding before generating an exam." }, { status: 409 });

    const curriculum = resolveCurriculum(learner, subject, topics[0]);
    if (!curriculum) return NextResponse.json({ error: "That subject is outside your enrolled academic scope." }, { status: 403 });

    const exam = await generateExam(subject, topics, difficulty, questionCount, user.id, curriculum);
    if (!exam) {
      return NextResponse.json({ error: "Cortex could not produce enough verified exam questions right now. No low-quality fallback was used. Please retry." }, { status: 503 });
    }

    return NextResponse.json({ exam, metadata: { stage: curriculum.stage, board: curriculum.board, qualification: curriculum.qualification, syllabusCode: curriculum.syllabusCode, syllabusYear: curriculum.syllabusYear } });
  } catch (err) {
    console.error("[API /cortex/generate-exam]", err);
    return NextResponse.json({ error: "Failed to generate exam" }, { status: 500 });
  }
}
