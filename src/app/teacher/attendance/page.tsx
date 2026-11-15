import { redirect } from "next/navigation";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";
import { AttendanceClient } from "./AttendanceClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Attendance · Shadecode Teacher" };

export default async function TeacherAttendancePage() {
  const workspace = await getTeacherWorkspace();
  if (!workspace) redirect("/");
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Teaching workspace</p>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">Take class registers, record attendance and keep a reliable history for each teaching group.</p>
      </header>
      <AttendanceClient />
    </div>
  );
}
