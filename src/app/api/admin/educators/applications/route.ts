import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function adminContext() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) };
  const { data: isAdmin, error } = await supabase.rpc("has_role", { user_id: user.id, role_name: "admin" });
  if (error || !isAdmin) return { response: NextResponse.json({ error: "Administrator access required." }, { status: 403 }) };
  return { supabase, user };
}

export async function GET() {
  const context = await adminContext();
  if ("response" in context) return context.response;
  const { data, error } = await context.supabase.from("platform_educator_profiles")
    .select("user_id,display_name,educator_type,bio,subjects,levels,experience_years,status,review_note,created_at")
    .in("status", ["pending", "changes_requested"])
    .order("created_at", { ascending: true }).limit(200);
  if (error) return NextResponse.json({ error: "Could not load educator applications." }, { status: 500 });
  return NextResponse.json({ applications: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const context = await adminContext();
  if ("response" in context) return context.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.userId !== "string" || !["approved", "changes_requested", "rejected", "suspended"].includes(body.status)) {
    return NextResponse.json({ error: "A valid application and review decision are required." }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1200) : "";
  if (body.status === "changes_requested" && !note) return NextResponse.json({ error: "Explain what the applicant needs to change." }, { status: 400 });
  const { data, error } = await context.supabase.from("platform_educator_profiles")
    .update({ status: body.status, review_note: note || null, reviewed_by: context.user.id })
    .eq("user_id", body.userId).in("status", ["pending", "changes_requested"])
    .select("user_id,status,review_note").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not record this review decision." }, { status: 409 });
  if (!data) return NextResponse.json({ error: "Application is no longer awaiting review. Refresh the queue." }, { status: 409 });
  return NextResponse.json({ application: data });
}
