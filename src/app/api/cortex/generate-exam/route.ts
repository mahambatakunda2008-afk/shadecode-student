import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateExam } from "@/lib/cortex/examGenerator";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { subject, topics, difficulty, questionCount } = body;

    if (!subject || !topics) {
      return NextResponse.json({ error: "subject and topics are required" }, { status: 400 });
    }

    const exam = await generateExam(
      subject,
      topics,
      difficulty || "medium",
      questionCount || 10,
      user.id
    );

    if (!exam) {
      return NextResponse.json({ error: "Failed to generate exam" }, { status: 500 });
    }

    return NextResponse.json({ exam });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate exam" },
      { status: 500 }
    );
  }
}
