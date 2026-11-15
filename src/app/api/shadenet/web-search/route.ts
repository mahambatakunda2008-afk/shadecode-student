import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";
import { isAllowedSubject } from "@/lib/academic/subjectContract";
import { createOpenWebKnowledgeSourceFromEnv } from "@/lib/shadenet/web-search";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import type { KnowledgeQuery } from "@/lib/shadenet/retrieval";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function POST(request: Request) {
  const rateLimit = await applyRateLimit(request, aiEndpointLimiter);
  if (rateLimit) return rateLimit;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null) as Partial<KnowledgeQuery> | null;
    const query = typeof body?.query === "string" ? body.query.trim().slice(0, 240) : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim().slice(0, 80) : "";
    if (!query) return NextResponse.json({ error: "Enter a search query." }, { status: 400 });
    if (!subject) return NextResponse.json({ error: "Choose one of your enrolled subjects." }, { status: 400 });

    const learner = await resolveLearnerSubjects(supabase, user.id);
    if (!learner.subjects.some((item) => isAllowedSubject(subject, [item.name]))) {
      return NextResponse.json({ error: "This subject is not in your enrolled subjects." }, { status: 403 });
    }

    const source = createOpenWebKnowledgeSourceFromEnv();
    if (!source) {
      return NextResponse.json({
        error: "Open web search is not configured on this deployment yet. Local and downloaded ShadeNet resources remain available.",
        code: "WEB_SEARCH_NOT_CONFIGURED",
      }, { status: 503 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const resources = await source.search({
        query,
        subject,
        qualification: typeof body?.qualification === "string" ? body.qualification.slice(0, 80) : undefined,
        syllabus: typeof body?.syllabus === "string" ? body.syllabus.slice(0, 40) : undefined,
        limit: Math.max(1, Math.min(8, Number(body?.limit) || 8)),
      }, controller.signal);
      return NextResponse.json({ resources, provider: process.env.BRAVE_SEARCH_API_KEY ? "Brave Search" : "Tavily" }, {
        headers: { "Cache-Control": "private, no-store" },
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error("[SHADENET] open web search failed", error);
    return NextResponse.json({ error: "Open web search could not complete. Try again or use saved resources." }, { status: 502 });
  }
}
