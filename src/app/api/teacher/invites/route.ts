import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";

/** Admin-only. Returns the plain code exactly once; only its SHA-256 hash is stored. */
export async function POST(request: Request) {
  const reviewer = await getReviewer();
  if (!reviewer?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 200) : "";

  const code = randomBytes(18).toString("base64url");
  const codeHash = createHash("sha256").update(code).digest("hex");
  const { error } = await reviewer.supabase
    .from("teacher_invites")
    .insert({ code_hash: codeHash, note: note || null, created_by: reviewer.user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ code });
}

export async function DELETE(request: Request) {
  const reviewer = await getReviewer();
  if (!reviewer?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await reviewer.supabase.from("teacher_invites").delete().eq("id", id).is("used_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
