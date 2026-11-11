import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Any signed-in user may try a code; the database function decides, atomically, whether it is valid and unused. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (code.length < 10 || code.length > 100) return NextResponse.json({ error: "Invalid invite" }, { status: 400 });

  const { data, error } = await supabase.rpc("redeem_teacher_invite", { invite_code: code });
  if (error) return NextResponse.json({ error: "Could not redeem invite" }, { status: 500 });
  if (data !== true) return NextResponse.json({ error: "This invite is invalid, already used, or expired." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
