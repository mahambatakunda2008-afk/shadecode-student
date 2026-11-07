import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The random request UUID is a narrow status capability. It reveals no user
 * identity or account data and is required after Auth deletion removes the
 * user's ability to sign in. Never return request metadata or error details.
 */
export async function GET(request: Request) {
  const requestId = new URL(request.url).searchParams.get("requestId")?.trim();
  if (!requestId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    return NextResponse.json(
      { error: "A valid deletion request ID is required." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Deletion status is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data, error } = await admin
    .from("account_deletion_requests")
    .select("status, completed_at")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    console.error("[AccountDeletion] Status lookup failed", { code: error.code ?? "unknown" });
    return NextResponse.json(
      { error: "Deletion status is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Deletion request not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { status: data.status, completedAt: data.completed_at, completed: data.status === "completed" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
