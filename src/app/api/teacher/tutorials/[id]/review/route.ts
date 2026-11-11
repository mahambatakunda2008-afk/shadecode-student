import { NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || !Number.isInteger(body.version) || !["verified", "changes_requested", "rejected"].includes(body.verdict)) {
    return NextResponse.json({ error: "A version and valid review verdict are required." }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  if (body.verdict !== "verified" && !note) return NextResponse.json({ error: "Explain what needs to change." }, { status: 400 });

  const { data, error } = await reviewer.supabase.rpc("review_teacher_tutorial", {
    p_tutorial_id: id,
    p_expected_version: body.version,
    p_verdict: body.verdict,
    p_note: note || null,
  });
  if (error) return NextResponse.json({ error: error.message.includes("no longer awaiting") ? "This tutorial has changed or is no longer awaiting review. Refresh the queue." : "Could not save review." }, { status: 409 });
  return NextResponse.json({ ok: true, status: data });
}
