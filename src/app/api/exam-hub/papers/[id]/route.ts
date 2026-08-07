import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes — plenty for viewing, short enough to limit leaked-link risk

export async function GET(
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

    const { data: paper, error: paperError } = await supabase
      .from("past_papers")
      .select("*")
      .eq("id", id)
      .single();

    if (paperError || !paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("past-papers")
      .createSignedUrl(paper.file_path, SIGNED_URL_TTL_SECONDS);

    if (signedError || !signed) {
      return NextResponse.json({ error: "Failed to generate file URL" }, { status: 500 });
    }

    const { data: state } = await supabase
      .from("user_past_paper_state")
      .select("*")
      .eq("user_id", user.id)
      .eq("paper_id", id)
      .maybeSingle();

    return NextResponse.json({
      paper: { ...paper, state: state ?? null },
      signedUrl: signed.signedUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load paper" },
      { status: 500 }
    );
  }
}
