import { NextResponse } from "next/server";
import { resolveAuthenticatedCortexStudentContext } from "@/lib/cortex/student-context";
import { resolveUserSystemCurriculum } from "@/lib/curriculum/user-resolution";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    const subjectId = new URL(request.url).searchParams.get("subjectId")?.trim() || undefined;
    const supabase = accessToken
      ? createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } },
        )
      : await createSupabaseServerClient();
    const { data: authData, error: authError } = accessToken
      ? await supabase.auth.getUser(accessToken)
      : await supabase.auth.getUser();
    if (authError || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const curriculum = await resolveUserSystemCurriculum(authData.user.id, subjectId, accessToken);
    const verifiedSyllabusId = curriculum.resolved.status === "resolved"
      ? curriculum.identity?.syllabusId ?? null
      : null;
    const curriculumIdentity = curriculum.identity
      ? {
          boardId: curriculum.identity.boardId,
          qualificationId: curriculum.identity.qualificationId,
          syllabusVersion: curriculum.identity.syllabusVersion ?? "",
          subjectId: curriculum.identity.subjectId,
        }
      : undefined;
    const context = await resolveAuthenticatedCortexStudentContext(accessToken, verifiedSyllabusId, curriculumIdentity);
    return NextResponse.json(context, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "STUDENT_CONTEXT_UNAVAILABLE";
    if (message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[api/cortex/student-context] failed:", error);
    return NextResponse.json(
      { error: "Student context is temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }
}
