import { NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "";
  if (!title) return NextResponse.json({ error: "Give the tutorial a title." }, { status: 400 });
  const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

  const { data, error } = await reviewer.supabase
    .from("teacher_tutorials")
    .insert({ title, subject: clean(body?.subject, 80), topic: clean(body?.topic, 120), author_id: reviewer.user.id })
    .select("id")
    .single();
  if (error || !data) return NextResponse.json({ error: "Could not create the tutorial." }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
