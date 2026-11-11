import { NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const reviewer = await getReviewer();
  if (!reviewer?.isAdmin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || !Number.isInteger(body.version)) return NextResponse.json({ error: "A tutorial version is required." }, { status: 400 });

  const { data, error } = await reviewer.supabase.rpc("publish_teacher_tutorial", {
    p_tutorial_id: id,
    p_expected_version: body.version,
  });
  if (error || data !== true) return NextResponse.json({ error: "Only the current verified version can be published." }, { status: 409 });
  return NextResponse.json({ ok: true, status: "published" });
}
