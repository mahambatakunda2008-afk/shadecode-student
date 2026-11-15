import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";
import { SubmissionInbox } from "./SubmissionInbox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Submissions · Shadecode Teacher" };

export default async function TeacherAssignmentSubmissionsPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const workspace = await getTeacherWorkspace();
  if (!workspace) redirect("/");
  const { assignmentId } = await params;
  const { data: assignment, error } = await workspace.supabase
    .from("platform_assignments").select("id").eq("id", assignmentId).maybeSingle();
  if (error) throw new Error("Could not load assignment.");
  if (!assignment) notFound();

  return (
    <div className="space-y-5">
      <Link href="/teacher/assignments" className="text-sm text-[var(--primary)] hover:underline">← Back to classwork</Link>
      <SubmissionInbox assignmentId={assignmentId} />
    </div>
  );
}
