import { NextResponse } from "next/server";
import { getReviewer } from "@/lib/exam/curated/reviewAccess";
import { validateTutorialBlocks } from "@/lib/teacher/tutorials";

export const dynamic = "force-dynamic";

export async function GET() {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const query = reviewer.supabase
    .from("teacher_tutorials")
    .select("id,author_id,title,subject,topic,summary,status,version,created_at,updated_at,submitted_at,verified_at,published_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load tutorials" }, { status: 500 });
  return NextResponse.json({ tutorials: data ?? [] });
}

export async function POST(request: Request) {
  const reviewer = await getReviewer();
  if (!reviewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || typeof body.subject !== "string") {
    return NextResponse.json({ error: "A title and subject are required." }, { status: 400 });
  }
  const title = body.title.trim();
  const subject = body.subject.trim();
  const topic = typeof body.topic === "string" ? body.topic.trim() : null;
  const summary = typeof body.summary === "string" ? body.summary.trim() : "";
  if (title.length < 3 || title.length > 180 || !subject || subject.length > 120 || (topic?.length ?? 0) > 180 || summary.length > 1200) {
    return NextResponse.json({ error: "Check the title, subject, topic and summary lengths." }, { status: 400 });
  }

  const parsed = validateTutorialBlocks(body.blocks, reviewer.user.id);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await reviewer.supabase
    .from("teacher_tutorials")
    .insert({
      author_id: reviewer.user.id,
      title,
      subject,
      topic: topic || null,
      summary,
      blocks: parsed.blocks,
      status: "draft",
      version: 1,
    })
    .select("id,author_id,title,subject,topic,summary,blocks,status,version,created_at,updated_at")
    .single();

  if (error || !data) return NextResponse.json({ error: "Could not create tutorial draft." }, { status: 500 });
  return NextResponse.json({ tutorial: data }, { status: 201 });
}
