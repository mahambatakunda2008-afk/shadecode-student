import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Legacy endpoint retired after notification delivery moved into the
 * rate-limited feedback persistence route. Keeping a clear 410 response
 * avoids leaving a separately abusable public email-sending endpoint.
 */
export async function POST() {
  return NextResponse.json(
    { success: false, error: "Submit feedback through /api/feedback instead." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
