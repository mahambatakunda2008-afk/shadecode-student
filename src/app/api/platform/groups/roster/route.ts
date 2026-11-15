import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The database function enforces active institution and teaching-group scope. */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const groupId = new URL(request.url).searchParams.get("groupId");
  if (!groupId) return NextResponse.json({ error: "A group ID is required." }, { status: 400 });

  const { data, error } = await supabase.rpc("list_platform_group_roster", {
    p_group_id: groupId,
  });
  if (error) return NextResponse.json({ error: "You do not have access to this class roster." }, { status: 403 });
  return NextResponse.json({ members: data ?? [] });
}
