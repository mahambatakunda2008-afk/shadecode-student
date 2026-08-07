import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasUserRole } from "@/lib/auth/rbac";
import { SESSIONS_BY_BOARD } from "@/lib/exam-hub/types";

export const dynamic = "force-dynamic";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false as const, status: 401, error: "Unauthorized" };
  if (!(await hasUserRole(user.id, "admin"))) return { ok: false as const, status: 403, error: "Admin access required" };
  return { ok: true as const, user };
}

const VALID_KINDS = ["qp", "ms", "in", "gt"];

// PATCH: fix a wrongly-assigned level/session/year/paper number/variant/kind
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json();
  const service = getServiceClient();

  const { data: existing, error: fetchError } = await service
    .from("past_papers")
    .select("*, syllabi(board)")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (body.level !== undefined) patch.level = String(body.level).trim();
  if (body.session !== undefined) {
    const board = (existing.syllabi as { board?: string } | null)?.board;
    const validSessions = board ? SESSIONS_BY_BOARD[board] : null;
    if (validSessions && !validSessions.includes(body.session)) {
      return NextResponse.json(
        { error: `Invalid session for ${board}. Expected one of: ${validSessions.join(", ")}` },
        { status: 400 }
      );
    }
    patch.session = String(body.session).trim();
  }
  if (body.year !== undefined) patch.year = Number(body.year);
  if (body.paper_number !== undefined) patch.paper_number = Number(body.paper_number);
  if (body.variant !== undefined) patch.variant = Number(body.variant);
  if (body.kind !== undefined) {
    if (!VALID_KINDS.includes(body.kind)) {
      return NextResponse.json({ error: "Invalid document kind" }, { status: 400 });
    }
    patch.kind = body.kind;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await service
    .from("past_papers")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // Most likely the unique constraint (syllabus/level/session/year/paper/variant/kind)
    return NextResponse.json({ error: `Update failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ paper: data });
}

// DELETE: remove a paper entirely (wrong entry, duplicate, etc.) -- also
// cleans up the underlying storage file so nothing orphaned is left behind.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const service = getServiceClient();

  const { data: paper } = await service.from("past_papers").select("file_path").eq("id", id).maybeSingle();
  if (!paper) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

  const { error: deleteError } = await service.from("past_papers").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  // Best-effort storage cleanup -- the DB row is already gone either way,
  // so a storage failure here shouldn't be reported as the delete failing.
  await service.storage.from("past-papers").remove([paper.file_path]);

  return NextResponse.json({ ok: true });
}
