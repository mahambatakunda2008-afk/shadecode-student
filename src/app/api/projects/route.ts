import { NextResponse } from 'next/server';
import { listProjects, getProjectById, startProjectForUser, updateProjectProgress, completeProject } from '@/lib/projects';

export async function GET(request: Request) {
  try {
    const items = await listProjects();
    return NextResponse.json({ success: true, projects: items });
  } catch (e) {
    console.error('[projects] list GET failed:', e);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const body = await request.json().catch(() => ({}));

    if (action === 'get') {
      const id = body.id;
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
      const p = await getProjectById(id);
      if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true, project: p });
    }

    if (action === 'start') {
      const id = body.id;
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
      await startProjectForUser(id);
      return NextResponse.json({ success: true });
    }

    if (action === 'progress') {
      const { id, progress } = body;
      if (!id || typeof progress !== 'number') return NextResponse.json({ error: 'Missing id/progress' }, { status: 400 });
      await updateProjectProgress(id, progress);
      return NextResponse.json({ success: true });
    }

    if (action === 'complete') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
      const res = await completeProject(id);
      return NextResponse.json({ success: true, ...res });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (e) {
    console.error('[projects] POST failed:', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
