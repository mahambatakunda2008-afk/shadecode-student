import ProjectDetail from "@/components/projects/ProjectDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-[#09091a] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        <ProjectDetail projectId={decodeURIComponent(id)} />
      </div>
    </div>
  );
}
