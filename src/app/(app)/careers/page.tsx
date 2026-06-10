import Link from 'next/link';
import { listCareers } from '@/lib/careers';

export default async function CareersPage() {
  const careers = await listCareers();
  return (
    <div style={{ padding: 20 }}>
      <h1>Career Explorer</h1>
      <p style={{ maxWidth: 800 }}>Explore careers, required skills, recommended courses, and suggested learning roadmaps. Pick a career to see recommended skills and courses tailored to reach that role.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 16 }}>
        {careers.map((c: any) => (
          <Link key={c.id} href={`/careers/${c.slug}`} style={{ border: '1px solid #eee', padding: 12, borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ fontWeight: 700 }}>{c.title}</div>
            <div style={{ color: 'gray', fontSize: 13 }}>{c.description?.slice(0, 120)}</div>
            {c.salary_low || c.salary_high ? <div style={{ marginTop: 8, fontSize: 13 }}>Salary: {c.salary_low ?? '?'} - {c.salary_high ?? '?'}</div> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
