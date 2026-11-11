import { NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { teacherMediaPrefix } from "@/lib/teacher/media";
import { sanitizeBlocks } from "@/lib/teacher/tutorial";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Save edits. Row-level security restricts this to the author while the tutorial is a draft or in review. */
export async function PUT(request: Request, { params }: Ctx) {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "";
  if (!title) return NextResponse.json({ error: "Give the tutorial a title." }, { status: 400 });
  const blocks = sanitizeBlocks(body?.blocks, teacherMediaPrefix());
  if (!blocks.ok) return NextResponse.json({ error: blocks.error }, { status: 400 });

  const { data, error } = await reviewer.supabase
    .from("teacher_tutorials")
    .update({ title, subject: clean(body?.subject, 80), topic: clean(body?.topic, 120), blocks: blocks.blocks, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_id", reviewer.user.id)
    .select("id");
  if (error) return NextResponse.json({ error: "Could not save." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "This tutorial can no longer be edited." }, { status: 409 });
  return NextResponse.json({ ok: true });
}

/** Status changes. Authors submit or withdraw; only admins verify or send back. */
export async function POST(request: Request, { params }: Ctx) {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const action = (await request.json().catch(() => null))?.action;

  let status: "draft" | "in_review" | "verified";
  let ownOnly = false;
  if (action === "submit") { status = "in_review"; ownOnly = true; }
  else if (action === "withdraw") { status = "draft"; ownOnly = true; }
  else if (action === "verify" && reviewer.isAdmin) status = "verified";
  else if (action === "send_back" && reviewer.isAdmin) status = "draft";
  else return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  if (action === "submit") {
    const { data } = await reviewer.supabase.from("teacher_tutorials").select("blocks").eq("id", id).eq("author_id", reviewer.user.id).maybeSingle();
    if (!data || !Array.isArray(data.blocks) || data.blocks.length === 0) {
      return NextResponse.json({ error: "Add some content before submitting for review." }, { status: 400 });
    }
  }

  let query = reviewer.supabase.from("teacher_tutorials").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (ownOnly) query = query.eq("author_id", reviewer.user.id);
  if (action === "verify") query = query.eq("status", "in_review");
  const { data, error } = await query.select("id");
  if (error) return NextResponse.json({ error: "Could not update." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Nothing to update." }, { status: 409 });
  return NextResponse.json({ ok: true, status });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { data, error } = await reviewer.supabase.from("teacher_tutorials").delete().eq("id", id).select("id");
  if (error || !data?.length) return NextResponse.json({ error: "Only drafts can be deleted." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
