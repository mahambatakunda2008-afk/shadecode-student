import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserRole } from "@/lib/auth/rbac";

const CONTRIBUTOR_XP_REWARD = 50;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(
  _request: Request,
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

    const service = getServiceClient();

    const { data: submission, error: fetchError } = await service
      .from("community_uploads")
      .select("*")
      .eq("id", id)
      .eq("status", "pending")
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!submission) {
      return NextResponse.json({ error: "Submission not found or already reviewed" }, { status: 404 });
    }

    // Move the file from the private pending bucket into the public
    // past-papers bucket -- same destination path convention the admin
    // upload route uses, so both paths converge on one canonical layout.
    const { data: fileData, error: downloadError } = await service.storage
      .from("community-uploads-pending")
      .download(submission.file_path);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: "Failed to read submitted file" }, { status: 500 });
    }

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const destPath = `${submission.syllabus_id}/${submission.level.replace(" ", "-")}/${submission.session.replace("/", "-")}/${submission.year}/${submission.syllabus_id}_${submission.level}_${submission.session}_${submission.year}_p${submission.paper_number}_v${submission.variant}_${submission.kind}.pdf`;

    const { error: uploadError } = await service.storage
      .from("past-papers")
      .upload(destPath, bytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: `Promotion upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: paper, error: paperError } = await service
      .from("past_papers")
      .upsert(
        {
          syllabus_id: submission.syllabus_id,
          level: submission.level,
          session: submission.session,
          year: submission.year,
          paper_number: submission.paper_number,
          variant: submission.variant,
          kind: submission.kind,
          file_path: destPath,
          file_size_bytes: bytes.byteLength,
          source_url: `community_upload:${submission.id}`, // provenance trail
        },
        { onConflict: "syllabus_id,level,session,year,paper_number,variant,kind" }
      )
      .select()
      .single();

    if (paperError) {
      return NextResponse.json({ error: `Catalog upsert failed: ${paperError.message}` }, { status: 500 });
    }

    const { error: updateError } = await service
      .from("community_uploads")
      .update({
        status: "approved",
        moderator_id: user.id,
        resulting_paper_id: paper.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    // Award XP -- non-fatal if it fails, the approval itself has already
    // succeeded and shouldn't be rolled back over a rewards hiccup.
    const { error: xpError } = await service.rpc("increment_xp", {
      user_id: submission.contributor_id,
      amount: CONTRIBUTOR_XP_REWARD,
    });

    if (!xpError) {
      await service.from("community_uploads").update({ xp_awarded: true }).eq("id", id);
    }

    // Clean up the pending-bucket copy now that it's promoted.
    await service.storage.from("community-uploads-pending").remove([submission.file_path]);

    return NextResponse.json({ paper, xpAwarded: !xpError });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Approval failed" },
      { status: 500 }
    );
  }
}
