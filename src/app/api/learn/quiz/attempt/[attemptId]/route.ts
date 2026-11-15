import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing server database credentials.");
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function bearer(req: Request) {
  const value = req.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() || null : null;
}

function publicQuestions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .map(({ correctIndex: _correctIndex, ...question }) => question);
}

export async function GET(req: Request, context: { params: Promise<{ attemptId: string }> }) {
  try {
    const limited = await applyRateLimit(req, aiEndpointLimiter);
    if (limited) return limited;
    const token = bearer(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = adminClient();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { attemptId } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(attemptId)) {
      return NextResponse.json({ error: "Invalid quiz attempt ID." }, { status: 400 });
    }

    const { data: attempt, error } = await admin.from("lesson_quiz_attempts")
      .select("id,lesson_id,questions,status,answers,result,created_at,completed_at")
      .eq("id", attemptId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Quiz attempt recovery failed:", error);
      return NextResponse.json({ error: "Could not recover this quiz attempt." }, { status: 503 });
    }
    if (!attempt) return NextResponse.json({ error: "Quiz attempt not found." }, { status: 404 });

    if (attempt.status === "completed") {
      if (!attempt.result || typeof attempt.result !== "object") {
        return NextResponse.json({ error: "Completed quiz result is unavailable." }, { status: 503 });
      }
      return NextResponse.json({
        attemptId: attempt.id,
        lessonId: attempt.lesson_id,
        status: "completed",
        result: attempt.result,
        completedAt: attempt.completed_at,
      });
    }

    return NextResponse.json({
      attemptId: attempt.id,
      lessonId: attempt.lesson_id,
      status: attempt.status,
      questions: publicQuestions(attempt.questions),
      // Answers are exposed only after the server has locked them during submit.
      answers: attempt.status === "processing" && Array.isArray(attempt.answers) ? attempt.answers : null,
      createdAt: attempt.created_at,
    });
  } catch (error) {
    console.error("Quiz attempt recovery error:", error);
    return NextResponse.json({ error: "Something went wrong recovering this quiz." }, { status: 500 });
  }
}
