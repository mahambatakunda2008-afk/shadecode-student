import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return NextResponse.json(
          { error: "Invalid request origin." },
          { status: 403, headers: { "Cache-Control": "no-store" } },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Sign in to request account deletion." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Identity and recent-authentication time are derived from the signed
  // Supabase session. No target user ID is accepted from the request body.
  const { data: requestId, error } = await supabase.rpc("request_account_deletion");

  if (error) {
    if (error.code === "28000" || /recent re-authentication/i.test(error.message)) {
      return NextResponse.json(
        { error: "For your security, sign out and sign back in before requesting account deletion." },
        { status:  reauthStatus, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error("[AccountDeletion] Could not enqueue request", { code: error.code ?? "unknown" });
    return NextResponse.json(
      { error: "Account deletion requests are temporarily unavailable. Please try again later." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (typeof requestId !== "string") {
    return NextResponse.json(
      { error: "Account deletion requests are temporarily unavailable. Please try again later." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { accepted: true, requestId, status: "pending", automaticDeletion: false },
    { status: 202, headers: { "Cache-Control": "no-store" } },
  );
}

const reauthStatus = 403;
