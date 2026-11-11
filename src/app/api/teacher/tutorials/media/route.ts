import { NextRequest, NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const path = request.nextUrl.searchParams.get("path") ?? "";
  if (!path || path.length > 500 || path.includes("..")) return NextResponse.json({ error: "Invalid media path." }, { status: 400 });

  const { data, error } = await reviewer.supabase.storage.from("teacher-media").createSignedUrl(path, 300);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "Media is unavailable or you do not have access." }, { status: 404 });
  return NextResponse.json({ signedUrl: data.signedUrl, expiresInSeconds: 300 });
}
