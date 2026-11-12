import { NextResponse } from "next/server";
import { resolveAuthenticatedCortexStudentContext } from "@/lib/cortex/student-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const accessToken = authorization.match(/^Bearer\\s+(.+)$/i)?.[1];
    const context = await resolveAuthenticatedCortexStudentContext(accessToken);
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
