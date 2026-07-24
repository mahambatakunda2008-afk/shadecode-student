import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserRole } from "@/lib/auth/rbac";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasUserRole(user.id, "admin"))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const notes = typeof body.notes === "string" ? body.notes : null;

    const service = getServiceClient();

    const { data: submission } = await service
      .from("community_uploads")
      .select("file_path")
      .eq("id", id)
      .eq("status", "pending")
      .maybeSingle();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found or already reviewed" }, { status: 404 });
    }

    const { error: updateError } = await service
      .from("community_uploads")
      .update({
        status: "rejected",
        moderator_id: user.id,
        moderator_notes: notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    // Remove the rejected file from storage — no reason to keep it around.
    await service.storage.from("community-uploads-pending").remove([submission.file_path]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Rejection failed" },
      { status: 500 }
    );
  }
}
