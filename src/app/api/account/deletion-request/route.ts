import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\\s+([^\\s]+)$/i);
  if (authorization && (!bearerMatch || bearerMatch[1].length > 4096)) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const origin = request.headers.get("origin");
  // Cookie-authenticated browser requests must carry a same-origin Origin
  // header. Native clients use a verified bearer token and do not rely on
  // browser cookies, so they may omit Origin.
  if (!origin && !bearerMatch) {
    return NextResponse.json(
      { error: "A same-origin request is required." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
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

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | ReturnType<typeof createClient>;
  let user: { id: string } | null = null;
  if (bearerMatch) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Account deletion requests are temporarily unavailable." }, { status: 503 });
    }
    // Native clients authenticate with their existing short-lived access
    // token. The anon key is public; no service-role credential reaches a device.
    supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearerMatch[1]}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error: authError } = await supabase.auth.getUser(bearerMatch[1]);
    if (!authError) user = data.user ? { id: data.user.id } : null;
  } else {
    supabase = await createSupabaseServerClient();
    const { data, error: authError } = await supabase.auth.getUser();
    if (!authError && data.user) user = { id: data.user.id };
  }

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to request account deletion." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Identity and recent-authentication time are derived from the signed
  // Supabase session or verified bearer token. No target user ID is accepted.
  const { data: requestId, error } = await supabase.rpc("request_account_deletion");

  if (error) {
    if (error.code === "28000" || /recent re-authentication/i.test(error.message)) {
      return NextResponse.json(
        { error: "For your security, sign out and sign back in before requesting account deletion." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
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

