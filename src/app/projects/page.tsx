import ProjectsList from '@/components/projects/ProjectsList';

export default function ProjectsPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Projects</h1>
      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>Build real projects that apply your lessons. Earn XP and unlock achievements.</p>
      <ProjectsList />
    </div>
  );
}
