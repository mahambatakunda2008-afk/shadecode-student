import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const url = new URL(request.url);
  const institutionId = url.searchParams.get("institutionId");
  if (institutionId) {
    const { data, error } = await supabase.rpc("list_platform_pending_guardian_links", {
      p_institution_id: institutionId,
    });
    if (error) return NextResponse.json({ error: "You cannot view this institution's family-link queue." }, { status: 403 });
    return NextResponse.json({ links: data ?? [] });
  }

  const { data, error } = await supabase.rpc("list_my_platform_guardian_links");
  if (error) return NextResponse.json({ error: "Could not load your family links." }, { status: 403 });
  return NextResponse.json({ links: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const institutionId = typeof body?.institutionId === "string" ? body.institutionId : "";
  const studentUserId = typeof body?.studentUserId === "string" ? body.studentUserId : "";
  const relationshipType = body?.relationshipType === "parent" ? "parent" : body?.relationshipType === "guardian" ? "guardian" : "";
  if (!institutionId || !studentUserId || !relationshipType) {
    return NextResponse.json({ error: "Institution, student account and relationship type are required." }, { status: 400 });
  }

  const code = randomBytes(32).toString("base64url");
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc("create_platform_guardian_invite", {
    p_institution_id: institutionId,
    p_student_user_id: studentUserId,
    p_relationship_type: relationshipType,
    p_code_hash: codeHash,
    p_expires_at: expiresAt,
  });
  if (error) return NextResponse.json({ error: "An active institution administrator must select an active student in this institution." }, { status: 403 });
  return NextResponse.json({ inviteId: data, code, expiresAt }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const relationshipId = typeof body?.relationshipId === "string" ? body.relationshipId : "";
  if (!relationshipId || typeof body?.approve !== "boolean") {
    return NextResponse.json({ error: "Relationship and approval decision are required." }, { status: 400 });
  }
  const { error } = await supabase.rpc("review_platform_guardian_link", {
    p_relationship_id: relationshipId,
    p_approve: body.approve,
  });
  if (error) return NextResponse.json({ error: "This request could not be reviewed. Check your institution administrator access." }, { status: 403 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const relationshipId = new URL(request.url).searchParams.get("relationshipId");
  if (!relationshipId) return NextResponse.json({ error: "Relationship ID is required." }, { status: 400 });
  const { error } = await supabase.rpc("revoke_platform_guardian_link", {
    p_relationship_id: relationshipId,
  });
  if (error) return NextResponse.json({ error: "This family link could not be revoked." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
