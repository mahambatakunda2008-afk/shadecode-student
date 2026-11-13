import { NextResponse } from "next/server";
import { resolveAuthenticatedCortexStudentContext } from "@/lib/cortex/student-context";
import { resolveUserSystemCurriculum } from "@/lib/curriculum/user-resolution";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    const subjectId = new URL(request.url).searchParams.get("subjectId")?.trim() || undefined;
    const authorizationClient = await import("@/lib/supabase/server");
    const supabase = accessToken
      ? (await import("@supabase/supabase-js")).createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } },
        )
      : await authorizationClient.createSupabaseServerClient();
    const { data: authData, error: authError } = accessToken
      ? await supabase.auth.getUser(accessToken)
      : await supabase.auth.getUser();
    if (authError || !authData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const curriculum = await resolveUserSystemCurriculum(authData.user.id, subjectId);
    const verifiedSyllabusId = !curriculum.blocked && curriculum.resolved.status === "resolved"
      ? curriculum.identity?.syllabusId ?? null
      : null;
    const context = await resolveAuthenticatedCortexStudentContext(accessToken, verifiedSyllabusId);
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
