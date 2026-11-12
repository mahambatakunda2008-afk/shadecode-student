import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { findReviewId } from "@/lib/exam/curated/lookup";
import { loadReviewStatus } from "@/lib/teacher/loadReviewStatus";
import { NOT_VERIFIED } from "@/lib/teacher/reviewStatus";
import { applyRateLimit, generalApiLimiter } from "@/lib/rate-limit/limiter";

export const dynamic = "force-dynamic";

/** Which of these multiple-choice questions are built-in questions that teachers have verified. Aligned with the input. */
export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, generalApiLimiter);
  if (limited) return limited;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.questions) ? body.questions.slice(0, 60) : null;
  if (!items) return NextResponse.json({ error: "questions required" }, { status: 400 });

  const ids = items.map((item: { question?: unknown; options?: unknown; answer?: unknown }) =>
    typeof item?.question === "string" && Array.isArray(item.options) && item.options.every((o) => typeof o === "string") && typeof item.answer === "string"
      ? findReviewId(item.question, item.options as string[], item.answer)
      : null,
  );
  const status = await loadReviewStatus(ids.filter((id: string | null): id is string => !!id));
  return NextResponse.json(
    { results: ids.map((id: string | null) => (id ? status.get(id) ?? NOT_VERIFIED : NOT_VERIFIED)) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
