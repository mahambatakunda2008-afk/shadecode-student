import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getAdminClient() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { supabase, user: null };

  const { data: isAdmin, error } = await supabase.rpc("has_role", {
    user_id: user.id,
    role_name: "admin",
  });
  if (error || !isAdmin) return { supabase, user: null };
  return { supabase, user };
}

export async function GET(request: Request) {
  const { supabase, user } = await getAdminClient();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";
  if (!["pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("exam_question_topic_proposals")
    .select("id,question_id,proposed_topic_id,confidence,evidence,source,model,status,reviewer_id,reviewed_at,created_at,exam_questions(question_number,paper_id,question_text)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proposals: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await getAdminClient();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.questionId !== "string" || typeof body.proposedTopicId !== "string" || typeof body.evidence !== "string" || typeof body.source !== "string") {
    return NextResponse.json({ error: "questionId, proposedTopicId, evidence and source are required" }, { status: 400 });
  }

  const confidence = body.confidence == null ? null : Number(body.confidence);
  if (confidence != null && (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)) {
    return NextResponse.json({ error: "confidence must be between 0 and 1" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("exam_question_topic_proposals")
    .insert({
      question_id: body.questionId,
      proposed_topic_id: body.proposedTopicId,
      confidence,
      evidence: body.evidence.trim().slice(0, 5000),
      source: body.source.trim().slice(0, 500),
      model: typeof body.model === "string" ? body.model.trim().slice(0, 200) : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ proposal: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getAdminClient();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !["approved", "rejected"].includes(body.status)) {
    return NextResponse.json({ error: "id and approved/rejected status are required" }, { status: 400 });
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("exam_question_topic_proposals")
    .select("id,question_id,proposed_topic_id,status")
    .eq("id", body.id)
    .single();
  if (proposalError || !proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  if (proposal.status !== "pending") return NextResponse.json({ error: "Proposal has already been reviewed" }, { status: 409 });

  if (body.status === "approved") {
    const { error: questionError } = await supabase
      .from("exam_questions")
      .update({ topic_id: proposal.proposed_topic_id })
      .eq("id", proposal.question_id);
    if (questionError) return NextResponse.json({ error: questionError.message }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from("exam_question_topic_proposals")
    .update({ status: body.status, reviewer_id: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", body.id)
    .eq("status", "pending");
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
