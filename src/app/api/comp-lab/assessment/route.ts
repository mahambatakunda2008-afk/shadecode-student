import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAlgorithmExercise, getAssessmentTestCases, normalizeOutput } from "@/lib/comp-lab/algorithms/assessment";

export const dynamic = "force-dynamic";

const MAX_CODE_LENGTH = 40_000;
const MAX_INPUTS = 32;

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

function safeString(value: unknown, max = 500) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/**
 * Authoritative assessment boundary.
 *
 * This endpoint intentionally does not accept expected outputs from the client.
 * Protected cases live in the server-side exercise definition and the response
 * exposes only aggregate results. A native/isolated executor can replace the
 * placeholder execution hook without changing the API contract.
 */
export async function POST(request: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid assessment request" }, { status: 400 });

  const input = body as Record<string, unknown>;
  const exerciseId = safeString(input.exerciseId, 120);
  const code = safeString(input.code, MAX_CODE_LENGTH);
  const language = safeString(input.language, 40);
  const exercise = getAlgorithmExercise(exerciseId);
  if (!exercise) return NextResponse.json({ error: "Unknown exercise" }, { status: 404 });
  if (!code.trim() || code.length > MAX_CODE_LENGTH) return NextResponse.json({ error: "Code is required and must be within the size limit" }, { status: 400 });
  if (language !== "pseudocode") return NextResponse.json({ error: "Authoritative algorithm assessment currently requires pseudocode" }, { status: 400 });

  const cases = getAssessmentTestCases(exercise);
  const hiddenCases = cases.filter(test => test.hidden);
  const visibleCases = cases.filter(test => !test.hidden);

  // The authoritative boundary is established here. Browser execution remains
  // the practice path. Protected execution is deliberately represented by a
  // conservative server response until a sandbox/native runner is available.
  const attemptId = crypto.randomUUID();
  const startedAt = Date.now();

  const { error: auditError } = await supabase.from("cortex_insights").insert({
    user_id: user.id,
    type: "comp-lab-authoritative-assessment",
    content: {
      attemptId,
      exerciseId,
      objectiveId: exercise.objectiveId,
      language,
      caseCount: cases.length,
      protectedCaseCount: hiddenCases.length,
      status: "accepted",
    },
  });

  if (auditError) {
    return NextResponse.json({ error: "Unable to record assessment attempt" }, { status: 500 });
  }

  return NextResponse.json({
    attemptId,
    exerciseId,
    objectiveId: exercise.objectiveId,
    authoritative: true,
    status: "accepted",
    execution: "pending-sandbox",
    visibleCaseCount: visibleCases.length,
    protectedCaseCount: hiddenCases.length,
    score: null,
    durationMs: Date.now() - startedAt,
    note: "Attempt accepted without exposing protected expected outputs. Execution requires an isolated authoritative runner.",
    codeFingerprint: normalizeOutput(code).length,
  }, { status: 202 });
}
