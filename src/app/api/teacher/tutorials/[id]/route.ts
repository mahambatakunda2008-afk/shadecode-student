import { NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { validateTutorialBlocks } from "@/lib/teacher/tutorials";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { data, error } = await reviewer.supabase
    .from("teacher_tutorials")
    .select("id,author_id,title,subject,topic,summary,blocks,status,version,created_at,updated_at,submitted_at,verified_at,published_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load tutorial." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Tutorial not found." }, { status: 404 });
  return NextResponse.json({ tutorial: data });
}

export async function PATCH(request: Request, { params }: Context) {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || !["draft", "in_review"].includes(body.status)) {
    return NextResponse.json({ error: "Only draft saving and review submission are supported here." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const topic = typeof body.topic === "string" ? body.topic.trim() : null;
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  if (title.length < 3 || title.length > 180 || !subject || subject.length > 120 || (topic?.length ?? 0) > 180 || summary.length > 1200) {
    return NextResponse.json({ error: "Check the title, subject, topic and summary lengths." }, { status: 400 });
  }

  const parsed = validateTutorialBlocks(body.blocks, reviewer.user.id);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (body.status === "in_review" && parsed.blocks.length === 0) {
    return NextResponse.json({ error: "Add content before submitting for review." }, { status: 400 });
  }

  const { data, error } = await reviewer.supabase
    .from("teacher_tutorials")
    .update({
      title,
      subject,
      topic: topic || null,
      summary,
      blocks: parsed.blocks,
      status: body.status,
    })
    .eq("id", id)
    .eq("author_id", reviewer.user.id)
    .in("status", ["draft", "changes_requested"])
    .select("id,title,subject,topic,summary,blocks,status,version,updated_at,submitted_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not save this tutorial. It may no longer be editable." }, { status: 409 });
  if (!data) return NextResponse.json({ error: "Tutorial not found or no longer editable." }, { status: 404 });
  return NextResponse.json({ tutorial: data });
}
