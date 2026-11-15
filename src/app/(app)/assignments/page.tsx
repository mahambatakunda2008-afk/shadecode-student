import StudentAssignments from "./StudentAssignments";

export const metadata = { title: "Classwork · Shadecode Student" };

export default function AssignmentsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-7 sm:px-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Your learning workspace</p>
        <h1 className="text-2xl font-semibold tracking-tight">Classwork</h1>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">See work from your teachers, submit your answers and receive feedback.</p>
      </header>
      <StudentAssignments />
    </div>
  );
}
