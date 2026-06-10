'use client';

import { useEffect, useState } from 'react';

export default function ProjectsList() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(j => { if (j?.projects) setProjects(j.projects); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading projects…</div>;
  if (projects.length === 0) return <div>No projects available yet.</div>;

  return (
    <div>
      {projects.map((p) => (
        <div key={p.id} style={{ border: '1px solid rgba(255,255,255,0.06)', padding: 12, borderRadius: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>{p.title || p.name || 'Untitled Project'}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{p.description ?? p.summary ?? ''}</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={() => window.location.href = `/projects/${p.id}`}>View</button>
            <button onClick={async () => { await fetch('/api/projects?action=start', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ id: p.id }) }); window.location.href = `/projects/${p.id}`; }}>Start</button>
          </div>
        </div>
      ))}
    </div>
  );
}
