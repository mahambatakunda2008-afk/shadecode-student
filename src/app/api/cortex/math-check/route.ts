import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkStudentAnswer, solveMathProblem } from "@/lib/cortex/mathEngine";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, problem, subject, studentAnswer } = body;

    if (!problem || !subject) {
      return NextResponse.json({ error: "problem and subject are required" }, { status: 400 });
    }

    switch (action) {
      case "solve": {
        const solution = await solveMathProblem(problem, subject, user.id);
        if (!solution) {
          return NextResponse.json({ error: "Failed to solve problem" }, { status: 500 });
        }
        return NextResponse.json({ solution });
      }

      case "check": {
        if (!studentAnswer) {
          return NextResponse.json({ error: "studentAnswer is required for check action" }, { status: 400 });
        }
        const result = await checkStudentAnswer(problem, subject, studentAnswer, user.id);
        if (!result) {
          return NextResponse.json({ error: "Failed to check answer" }, { status: 500 });
        }
        return NextResponse.json({ result });
      }

      default:
        return NextResponse.json({ error: "Unknown action. Use 'solve' or 'check'." }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
