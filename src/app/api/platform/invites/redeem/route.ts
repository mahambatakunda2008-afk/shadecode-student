import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (code.length < 20 || code.length > 128) {
    return NextResponse.json({ error: "This invitation is invalid or expired." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("redeem_platform_institution_invite", { p_code: code });
  if (error) return NextResponse.json({ error: "This invitation is invalid, expired, revoked or already used." }, { status: 400 });
  return NextResponse.json({ membership: data });
}
