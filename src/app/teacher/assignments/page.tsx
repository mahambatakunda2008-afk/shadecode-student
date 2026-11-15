import { redirect } from "next/navigation";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";
import { AssignmentsClient } from "./AssignmentsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Classwork · Shadecode Teacher" };

export default async function TeacherAssignmentsPage() {
  const workspace = await getTeacherWorkspace();
  if (!workspace) redirect("/");
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Teaching workspace</p>
        <h1 className="text-2xl font-semibold tracking-tight">Classwork and assignments</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">Create and publish work for your classes. Learner submissions and marking stay scoped to the class membership rules.</p>
      </header>
      <AssignmentsClient />
    </div>
  );
}
