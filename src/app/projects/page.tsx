import ProjectsList from '@/components/projects/ProjectsList';

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-[#09091a] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-300/70">Project-Based Learning</p>
          <h1 className="text-3xl font-extrabold">Projects</h1>
          <p className="max-w-2xl text-sm text-white/55">
            Build real things from your lessons, track progress, and earn XP when the work is done.
          </p>
        </div>

      <ProjectsList />
      </div>
    </div>
  );
}
