import { NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/webm": "webm",
};
const MAX_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.tutorialId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.tutorialId)) {
    return NextResponse.json({ error: "A valid tutorial ID is required." }, { status: 400 });
  }
  if (typeof body.mimeType !== "string" || !MIME_EXTENSIONS[body.mimeType] || !Number.isInteger(body.size) || body.size < 1 || body.size > MAX_BYTES) {
    return NextResponse.json({ error: "Unsupported file type or file larger than 50 MiB." }, { status: 400 });
  }

  const { data: tutorial } = await reviewer.supabase
    .from("teacher_tutorials")
    .select("id")
    .eq("id", body.tutorialId)
    .eq("author_id", reviewer.user.id)
    .in("status", ["draft", "changes_requested"])
    .maybeSingle();
  if (!tutorial) return NextResponse.json({ error: "Editable tutorial not found." }, { status: 404 });

  const path = `${reviewer.user.id}/${tutorial.id}/${crypto.randomUUID()}.${MIME_EXTENSIONS[body.mimeType]}`;
  const { data, error } = await reviewer.supabase.storage.from("teacher-media").createSignedUploadUrl(path, { upsert: false });
  if (error || !data) return NextResponse.json({ error: "Could not prepare a secure upload." }, { status: 500 });

  return NextResponse.json({ path: data.path, token: data.token, signedUrl: data.signedUrl, expiresInSeconds: 120 });
}
