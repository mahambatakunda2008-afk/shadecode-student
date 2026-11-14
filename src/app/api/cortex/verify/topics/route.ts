import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveLearnerSubject } from "@/lib/academic/subjectAccess";
import { resolveUserSystemCurriculum } from "@/lib/curriculum/user-resolution";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authorization = req.headers.get("authorization") || "";
    const bearerToken = authorization.match(/^Bearer\\s+(.+)$/i)?.[1]?.trim();
    const supabase = bearerToken
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${bearerToken}` } } },
        )
      : await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser(bearerToken || undefined);
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const requestedSubject = new URL(req.url).searchParams.get("subject")?.trim() || "";
    const access = await resolveLearnerSubject(supabase, user.id, requestedSubject);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const curriculum = await resolveUserSystemCurriculum(user.id, access.subject, bearerToken || undefined);
    if (curriculum.resolved.status !== "resolved") {
      return NextResponse.json({ topics: [], curriculumStatus: curriculum.resolved.status, reason: curriculum.resolved.reason || "A verified syllabus is not configured yet." });
    }

    const unique = new Map<string, { id: string; title: string; code: string }>();
    for (const item of curriculum.resolved.knowledge || []) {
      const code = typeof item.topicCode === "string" ? item.topicCode.trim() : "";
      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!code || !title) continue;
      const id = code.slice(0, 120);
      if (!unique.has(id)) unique.set(id, { id, code, title: title.slice(0, 180) });
    }
    const topics = [...unique.values()].sort((a, b) => a.title.localeCompare(b.title));
    return NextResponse.json({
      topics,
      curriculumStatus: "resolved",
      syllabus: {
        boardId: curriculum.identity?.boardId,
        qualificationId: curriculum.identity?.qualificationId,
        syllabusVersion: curriculum.identity?.syllabusVersion,
      },
    });
  } catch (error) {
    console.error("[cortex verify topics] failed:", error);
    return NextResponse.json({ error: "Could not load verified syllabus topics." }, { status: 500 });
  }
}
