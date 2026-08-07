import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await hasUserRole(user.id, "admin"))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const service = getServiceClient();
    const { data, error } = await service
      .from("community_uploads")
      .select("*, syllabi(subject, board)")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Attach a short-lived signed URL for the moderator to preview each
    // submission before approving.
    const withUrls = await Promise.all(
      (data ?? []).map(async (row) => {
        const { data: signed } = await service.storage
          .from("community-uploads-pending")
          .createSignedUrl(row.file_path, 600);
        return { ...row, previewUrl: signed?.signedUrl ?? null };
      })
    );

    return NextResponse.json({ submissions: withUrls });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load submissions" },
      { status: 500 }
    );
  }
}
