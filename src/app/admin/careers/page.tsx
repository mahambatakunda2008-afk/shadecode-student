"use client";

import { useEffect, useState } from 'react';

export default function AdminCareersPage() {
  const [careers, setCareers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminToken, setAdminToken] = useState('');
  const [form, setForm] = useState({ title: '', slug: '', description: '', salary_low: '', salary_high: '' });

  const fetchCareers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/careers');
      const data = await res.json();
      setCareers(data?.careers ?? []);
    } catch (e) { console.error(e); setCareers([]); }
    setLoading(false);
  };

  useEffect(() => { fetchCareers(); }, []);

  const createCareer = async () => {
    if (!adminToken) { alert('Enter admin token'); return; }
    try {
      const res = await fetch('/api/admin/careers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken }, body: JSON.stringify({ action: 'create', career: form }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'create failed');
      alert('Created'); setForm({ title: '', slug: '', description: '', salary_low: '', salary_high: '' }); fetchCareers();
    } catch (e: any) { alert('Create failed: ' + (e?.message || e)); }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Careers Admin</h1>
      <div style={{ marginBottom: 12 }}>
        <input placeholder="Admin token" value={adminToken} onChange={e => setAdminToken(e.target.value)} style={{ padding: 8, width: 360 }} />
      </div>
      <section style={{ marginBottom: 24 }}>
        <h2>Create Career</h2>
        <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ display: 'block', width: 400, marginBottom: 8 }} />
        <input placeholder="Slug (url)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} style={{ display: 'block', width: 400, marginBottom: 8 }} />
        <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ display: 'block', width: 600, height: 80, marginBottom: 8 }} />
        <input placeholder="Salary low" value={form.salary_low} onChange={e => setForm({ ...form, salary_low: e.target.value })} style={{ display: 'inline-block', width: 120, marginRight: 8 }} />
        <input placeholder="Salary high" value={form.salary_high} onChange={e => setForm({ ...form, salary_high: e.target.value })} style={{ display: 'inline-block', width: 120 }} />
        <div style={{ marginTop: 8 }}><button onClick={createCareer}>Create</button></div>
      </section>

      <section>
        <h2>Existing Careers</h2>
        {loading ? <p>Loading...</p> : careers.length === 0 ? <p>No careers yet.</p> : (
          careers.map(c => (
            <div key={c.id} style={{ border: '1px solid #eee', padding: 10, marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>{c.title} <small style={{ color: 'gray' }}>({c.slug})</small></div>
              <div style={{ color: 'gray' }}>{c.description}</div>
              <div>Salary: {c.salary_low ?? '?'} - {c.salary_high ?? '?'}</div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
