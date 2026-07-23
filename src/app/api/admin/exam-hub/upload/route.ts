import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserRole } from "@/lib/auth/rbac";

const VALID_LEVELS = ["AS Level", "A Level"];
const VALID_SESSIONS = ["Feb/March", "May/June", "Oct/Nov"];
const VALID_KINDS = ["qp", "ms", "in", "gt"];

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(request: Request) {
  try {
    // Auth: must be a logged-in admin. Uses the same RBAC system as the
    // rest of the app (roles/user_roles + has_role RPC) — no parallel
    // auth mechanism.
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const isAdmin = await hasUserRole(user.id, "admin");
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
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
    if (!syllabusId || !VALID_LEVELS.includes(level) || !VALID_SESSIONS.includes(session)) {
      return NextResponse.json({ error: "Invalid level or session" }, { status: 400 });
    }
    if (!VALID_KINDS.includes(kind)) {
      return NextResponse.json({ error: "Invalid paper kind" }, { status: 400 });
    }
    if (!Number.isInteger(year) || !Number.isInteger(paperNumber) || !Number.isInteger(variant)) {
      return NextResponse.json({ error: "Year, paper number, and variant must be integers" }, { status: 400 });
    }

    const service = getServiceClient();

    const { data: syllabus } = await service.from("syllabi").select("id").eq("id", syllabusId).maybeSingle();
    if (!syllabus) {
      return NextResponse.json({ error: `Unknown syllabus code: ${syllabusId}` }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const storagePath = `${syllabusId}/${level.replace(" ", "-")}/${session.replace("/", "-")}/${year}/${syllabusId}_${level}_${session}_${year}_p${paperNumber}_v${variant}_${kind}.pdf`;

    const { error: uploadError } = await service.storage
      .from("past-papers")
      .upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: paper, error: dbError } = await service
      .from("past_papers")
      .upsert(
        {
          syllabus_id: syllabusId,
          level,
          session,
          year,
          paper_number: paperNumber,
          variant,
          kind,
          file_path: storagePath,
          file_size_bytes: bytes.byteLength,
        },
        { onConflict: "syllabus_id,level,session,year,paper_number,variant,kind" }
      )
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: `Database upsert failed: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ paper });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
