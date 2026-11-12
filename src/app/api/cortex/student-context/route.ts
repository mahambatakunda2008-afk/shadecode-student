import { NextResponse } from "next/server";
import { resolveAuthenticatedCortexStudentContext } from "@/lib/cortex/student-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const context = await resolveAuthenticatedCortexStudentContext();
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
