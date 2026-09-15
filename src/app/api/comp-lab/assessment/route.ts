import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAlgorithmExercise, getAssessmentTestCases } from "@/lib/comp-lab/algorithms/assessment";

export const dynamic = "force-dynamic";
const MAX_CODE_LENGTH = 40_000;

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user: error || !user ? null : user };
}

/**
 * Authoritative assessment boundary.
 * The client supplies only the learner artifact. Expected outputs and protected
 * cases are resolved server-side and are never accepted from the request body.
 */
export async function POST(request: Request) {
  const { user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid assessment request" }, { status: 400 });

  const input = body as Record<string, unknown>;
  const exerciseId = typeof input.exerciseId === "string" ? input.exerciseId.slice(0, 120) : "";
  const code = typeof input.code === "string" ? input.code : "";
  const language = typeof input.language === "string" ? input.language : "";
  const exercise = getAlgorithmExercise(exerciseId);
  if (!exercise) return NextResponse.json({ error: "Unknown exercise" }, { status: 404 });
  if (!code.trim() || code.length > MAX_CODE_LENGTH) return NextResponse.json({ error: "Code is required and must be within the size limit" }, { status: 400 });
  if (language !== "pseudocode") return NextResponse.json({ error: "Authoritative algorithm assessment currently requires pseudocode" }, { status: 400 });

  const cases = getAssessmentTestCases(exercise);
  const attemptId = crypto.randomUUID();

  return NextResponse.json({
    attemptId,
    exerciseId,
    objectiveId: exercise.objectiveId,
    authoritative: true,
    status: "accepted",
    execution: "pending-sandbox",
    caseCount: cases.length,
    protectedCaseCount: cases.filter(test => test.hidden).length,
    score: null,
    message: "Attempt accepted. Protected execution requires the isolated assessment runner.",
  }, { status: 202 });
}
