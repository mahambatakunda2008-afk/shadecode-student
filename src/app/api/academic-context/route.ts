import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAcademicContext } from "@/lib/academic/context";

export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("academic_contexts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed to load academic context" }, { status: 500 });
  return NextResponse.json({ context: data });
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const context = normalizeAcademicContext(
      body && typeof body === "object" ? body as Record<string, unknown> : {},
    );

    const { data, error } = await supabase.from("academic_contexts").upsert({
      user_id: user.id,
      ...context,
    }, { onConflict: "user_id" }).select("*").single();

    if (error) return NextResponse.json({ error: "Failed to save academic context" }, { status: 500 });
    return NextResponse.json({ context: data });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Invalid academic context",
    }, { status: 400 });
  }
}
