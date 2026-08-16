import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("has_role", { user_id: user.id, role_name: "admin" });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (typeof body?.active !== "boolean") return NextResponse.json({ error: "active must be boolean" }, { status: 400 });

  const { data, error } = await supabase
    .from("experiments")
    .update({ active: body.active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id,key,name,active")
    .single();

  if (error) return NextResponse.json({ error: "Unable to update experiment" }, { status: 500 });
  return NextResponse.json({ experiment: data });
}
