import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveVerifiedCurriculumPromptContext } from "@/lib/curriculum/ai-grounding";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const subject = (url.searchParams.get("subject") || "").trim();
    const topic = (url.searchParams.get("topic") || "").trim();
    if (!subject || !topic) return NextResponse.json({ error: "subject and topic are required" }, { status: 400 });

    const result = await resolveVerifiedCurriculumPromptContext(user.id, `Subject: ${subject}\nMaster this request: "${topic}"`);
    return NextResponse.json({
      status: result.status,
      reason: result.reason,
      promptContext: result.promptContext,
      pack: result.status === "resolved" ? result.pack : undefined,
    }, { status: result.status === "blocked" ? 409 : 200 });
  } catch (error) {
    console.error("[api/curriculum/grounding] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
