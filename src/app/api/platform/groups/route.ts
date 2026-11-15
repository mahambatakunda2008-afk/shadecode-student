import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const institutionId = typeof body?.institutionId === "string" ? body.institutionId : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const groupType = typeof body?.groupType === "string" ? body.groupType : "class";
  const parentGroupId = typeof body?.parentGroupId === "string" ? body.parentGroupId : null;
  if (!institutionId || !name || name.length > 120) {
    return NextResponse.json({ error: "Institution and a group name of up to 120 characters are required." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("create_platform_group", {
    p_institution_id: institutionId,
    p_name: name,
    p_group_type: groupType,
    p_parent_group_id: parentGroupId,
  });
  if (error) return NextResponse.json({ error: "An active institution administrator is required, or the group details are invalid." }, { status: 403 });
  return NextResponse.json({ groupId: data }, { status: 201 });
}
