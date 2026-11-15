import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Institution-scoped invite creation. The plaintext code is returned once and never stored. */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const institutionId = typeof body?.institutionId === "string" ? body.institutionId : "";
  const membershipRole = typeof body?.membershipRole === "string" ? body.membershipRole : "";
  const groupId = typeof body?.groupId === "string" ? body.groupId : null;
  if (!institutionId || !membershipRole) {
    return NextResponse.json({ error: "Institution and membership role are required." }, { status: 400 });
  }

  const code = randomBytes(32).toString("base64url");
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc("create_platform_institution_invite", {
    p_institution_id: institutionId,
    p_code_hash: codeHash,
    p_membership_role: membershipRole,
    p_group_id: groupId,
    p_expires_at: expiresAt,
  });
  if (error) return NextResponse.json({ error: "An active institution administrator is required, or the invitation details are invalid." }, { status: 403 });
  return NextResponse.json({ inviteId: data, code, expiresAt }, { status: 201 });
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const url = new URL(request.url);
  const institutionId = url.searchParams.get("institutionId");
  const inviteId = url.searchParams.get("inviteId");
  if (!institutionId || !inviteId) {
    return NextResponse.json({ error: "Institution and invite IDs are required." }, { status: 400 });
  }
  const { error } = await supabase.rpc("revoke_platform_institution_invite", {
    p_institution_id: institutionId,
    p_invite_id: inviteId,
  });
  if (error) return NextResponse.json({ error: "Invite could not be revoked. It may already be used or you may lack access." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
