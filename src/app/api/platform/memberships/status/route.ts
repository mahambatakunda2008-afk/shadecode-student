import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const institutionId = typeof body?.institutionId === "string" ? body.institutionId : "";
  const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId : "";
  const status = typeof body?.status === "string" ? body.status : "";
  const groupId = typeof body?.groupId === "string" ? body.groupId : null;
  if (!institutionId || !targetUserId || !["active", "suspended", "revoked"].includes(status)) {
    return NextResponse.json({ error: "Institution, target user and a valid membership status are required." }, { status: 400 });
  }

  const { error } = await supabase.rpc("set_platform_membership_status", {
    p_institution_id: institutionId,
    p_target_user_id: targetUserId,
    p_status: status,
    p_group_id: groupId,
  });
  if (error) return NextResponse.json({ error: "Membership could not be changed. Check institution administrator access and membership state." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
