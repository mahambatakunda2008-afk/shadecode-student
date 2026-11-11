import { NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { MEDIA_MAX_BYTES, MEDIA_TYPES, teacherMediaPrefix } from "@/lib/teacher/media";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  const ext = MEDIA_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG or WebP image." }, { status: 400 });
  if (file.size > MEDIA_MAX_BYTES) return NextResponse.json({ error: "Image is larger than 3 MB." }, { status: 400 });

  const path = `${reviewer.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await reviewer.supabase.storage.from("teacher-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: "Upload failed. Try again." }, { status: 500 });
  return NextResponse.json({ url: `${teacherMediaPrefix()}${path}` });
}
