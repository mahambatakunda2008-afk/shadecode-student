import WorkmatePanel from "@/components/workmate/WorkmatePanel";

export default function WorkmatePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-5 sm:p-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--primary)]">CORTEX WORKSPACE</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Workmate</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">Bring any schoolwork here. Check it, find mistakes, get guided help, and learn from the reasoning across subjects.</p>
      </header>
      <WorkmatePanel />
    </div>
  );
}
