import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: memberships, error: membershipError } = await supabase
    .from("platform_group_members").select("group_id")
    .eq("user_id", user.id).eq("status", "active").eq("membership_role", "student");
  if (membershipError) return NextResponse.json({ error: "Could not load your classes." }, { status: 500 });
  const groupIds = [...new Set((memberships ?? []).map((row) => row.group_id))];
  if (!groupIds.length) return NextResponse.json({ assignments: [] });

  const { data: assignments, error } = await supabase
    .from("platform_assignments")
    .select("id,group_id,title,subject,instructions,due_at,max_score,assessment_type,questions,created_at")
    .in("group_id", groupIds).eq("status", "published")
    .order("due_at", { ascending: true, nullsFirst: false }).limit(100);
  if (error) return NextResponse.json({ error: "Could not load classwork." }, { status: 500 });

  const assignmentIds = (assignments ?? []).map((assignment) => assignment.id);
  const { data: submissions } = assignmentIds.length
    ? await supabase.from("platform_assignment_submissions")
        .select("assignment_id,submitted_at,status,score,feedback")
        .eq("student_id", user.id).in("assignment_id", assignmentIds)
    : { data: [] };
  const submitted = new Map((submissions ?? []).map((submission) => [submission.assignment_id, submission]));
  return NextResponse.json({
    assignments: (assignments ?? []).map((assignment) => ({
      ...assignment,
      questions: (assignment.questions ?? []).map((question: { prompt: string; type: string; marks: number; options?: string[] }) => ({
        prompt: question.prompt, type: question.type, marks: question.marks, options: question.options ?? [],
      })),
      submission: submitted.get(assignment.id) ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.assignmentId !== "string" || typeof body.response !== "string" || body.response.length > 30000) {
    return NextResponse.json({ error: "Enter a response of up to 30,000 characters." }, { status: 400 });
  }
  const { data, error } = await supabase.rpc("submit_platform_assignment", {
    p_assignment_id: body.assignmentId,
    p_response: body.response,
  });
  if (error) {
    const forbidden = error.code === "42501";
    return NextResponse.json({
      error: forbidden ? "This assignment is not available to your account." :
        error.message?.includes("deadline") ? "The deadline has passed." : "Could not submit your work.",
    }, { status: forbidden ? 403 : 400 });
  }
  return NextResponse.json({ id: data }, { status: 201 });
}
