import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateExam } from "@/lib/cortex/examGenerator";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Sign in to generate an exam." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.json({ error: "Exam service is not configured." }, { status: 503 });

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });

  try {
    const body = await request.json().catch(() => null);
    const requestedSubject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const topics = Array.isArray(body?.topics) ? body.topics.filter((v: unknown): v is string => typeof v === "string" && v.trim()).slice(0, 12) : [];
    const difficulty = body?.difficulty === "easy" || body?.difficulty === "hard" ? body.difficulty : "medium";
    const count = Number.isFinite(Number(body?.questionCount)) ? Math.max(5, Math.min(20, Math.round(Number(body.questionCount)))) : 10;
    if (!requestedSubject) return NextResponse.json({ error: "Choose a subject first." }, { status: 400 });
    const access = await resolveLearnerSubject(supabase, user.id, requestedSubject, body?.subjectId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const exam = await generateExam(access.subject, topics, difficulty, count, user.id);
    if (!exam || !Array.isArray(exam.questions) || exam.questions.length < 1) {
      return NextResponse.json({ error: "Cortex could not produce a verified paper. No placeholder questions were used. Please retry." }, { status: 503 });
    }
    return NextResponse.json({ exam, subject: access.subject, subjectId: access.subjectId });
  } catch (error) {
    console.error("[native exam-sim generate]", error);
    return NextResponse.json({ error: "Could not generate this exam right now." }, { status: 502 });
  }
}
