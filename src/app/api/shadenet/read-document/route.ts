import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubjects } from "@/lib/subjects/resolveLearnerSubjects";
import { isAllowedSubject } from "@/lib/academic/subjectContract";
import { applyRateLimit, aiEndpointLimiter } from "@/lib/rate-limit/limiter";
import { readPublicWebDocument } from "@/lib/shadenet/web-document-reader";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function POST(request: Request) {
  const rateLimit = await applyRateLimit(request, aiEndpointLimiter);
  if (rateLimit) return rateLimit;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim().slice(0, 80) : "";
    if (!url || !subject) return NextResponse.json({ error: "A source URL and enrolled subject are required." }, { status: 400 });
    const learner = await resolveLearnerSubjects(supabase, user.id);
    if (!learner.subjects.some((item) => isAllowedSubject(subject, [item.name]))) {
      return NextResponse.json({ error: "This subject is not in your enrolled subjects." }, { status: 403 });
    }
    const resource = await readPublicWebDocument({
      url,
      subject,
      qualification: typeof body?.qualification === "string" ? body.qualification.slice(0, 80) : undefined,
      syllabus: typeof body?.syllabus === "string" ? body.syllabus.slice(0, 40) : undefined,
    });
    return NextResponse.json({ resource }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The source could not be read.";
    console.warn("[SHADENET] web document read failed", message);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
