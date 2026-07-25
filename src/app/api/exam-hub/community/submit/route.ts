import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SESSIONS_BY_BOARD } from "@/lib/exam-hub/types";

const VALID_UPLOAD_TYPES = ["paper", "mark_scheme", "examiner_report", "variant"];
const VALID_KINDS = ["qp", "ms", "in", "gt"];

// Uses the caller's own session (not the service role) — RLS on the
// community-uploads-pending bucket and community_uploads table enforces
// that a contributor can only write their own submissions. Nothing here
// is promoted to the public catalog; that only happens via the admin
// approve route.
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const uploadType = String(formData.get("uploadType") ?? "").trim();
    const syllabusId = String(formData.get("syllabusId") ?? "").trim();
    const level = String(formData.get("level") ?? "").trim();
    const session = String(formData.get("session") ?? "").trim();
    const year = Number(formData.get("year"));
    const paperNumber = Number(formData.get("paperNumber"));
    const variant = Number(formData.get("variant"));
    const kind = String(formData.get("kind") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (25MB limit)" }, { status: 400 });
    }
    if (!VALID_UPLOAD_TYPES.includes(uploadType)) {
      return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
    }
    if (!VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: "Invalid document kind" }, { status: 400 });
    }
    if (!syllabusId || !level || !session) {
      return NextResponse.json({ error: "Missing syllabus, level, or session" }, { status: 400 });
    }
    if (!Number.isInteger(year) || !Number.isInteger(paperNumber) || !Number.isInteger(variant)) {
      return NextResponse.json({ error: "Year, paper number, and variant must be integers" }, { status: 400 });
    }

    const { data: syllabus } = await supabase
      .from("syllabi")
      .select("id, board")
      .eq("id", syllabusId)
      .maybeSingle();
    if (!syllabus) {
      return NextResponse.json({ error: `Unknown syllabus code: ${syllabusId}` }, { status: 400 });
    }
    const validSessions = SESSIONS_BY_BOARD[syllabus.board];
    if (validSessions && !validSessions.includes(session)) {
      return NextResponse.json(
        { error: `Invalid session for ${syllabus.board}. Expected one of: ${validSessions.join(", ")}` },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    // Path is prefixed with the contributor's own uid — the storage RLS
    // policy checks this prefix to scope read access to "own uploads or
    // admin", so this prefix isn't just organizational, it's load-bearing.
    const storagePath = `${user.id}/${Date.now()}_${syllabusId}_${level}_${session}_${year}_p${paperNumber}_v${variant}_${kind}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("community-uploads-pending")
      .upload(storagePath, bytes, { contentType: "application/pdf" });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: submission, error: dbError } = await supabase
      .from("community_uploads")
      .insert({
        contributor_id: user.id,
        upload_type: uploadType,
        syllabus_id: syllabusId,
        level,
        session,
        year,
        paper_number: paperNumber,
        variant,
        kind,
        file_path: storagePath,
        file_size_bytes: bytes.byteLength,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: `Submission failed: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ submission });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Submission failed" },
      { status: 500 }
    );
  }
}
