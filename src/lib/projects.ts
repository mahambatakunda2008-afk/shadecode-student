import { createSupabaseServerClient } from '@/lib/supabase/server';

export type ProjectDraft = {
  id?: string;
  title: string;
  description?: string;
  difficulty?: 'easy'|'medium'|'hard';
  estimatedMinutes?: number;
  requiredLessons?: string[]; // lesson IDs
  xpReward?: number;
  metadata?: any;
};

export async function listProjects() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('generated_course_drafts')
    .select('id, user_id, draft, status, created_at')
    .filter("draft->>type", 'eq', 'project')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[projects] list error:', error);
    return [];
  }

  return (data ?? []).map((r: any) => ({ id: r.id, ...(r.draft ?? {}) }));
}

export async function getProjectById(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('generated_course_drafts')
    .select('id, draft')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, ...(data.draft ?? {}) };
}

export async function startProjectForUser(projectId: string) {
  const supabase = await createSupabaseServerClient();
  // Resolve user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Insert or update insight row that tracks project progress
  const meta = { projectId, status: 'started', progress: 0, started_at: new Date().toISOString() };
  try {
    await supabase.from('insights').insert({
      user_id: user.id,
      title: `project:${projectId}:progress`,
      content: `Project ${projectId} started`,
      metadata: meta,
    });
  } catch (e) {
    console.error('[projects] start insight insert failed:', e?.message ?? e);
  }

  return { success: true };
}

export async function updateProjectProgress(projectId: string, progress: number) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  try {
    // Find existing insight
    const { data, error } = await supabase.from('insights').select('id, metadata').eq('user_id', user.id).eq('title', `project:${projectId}:progress`).maybeSingle();
    if (!data) {
      // create
      await supabase.from('insights').insert({ user_id: user.id, title: `project:${projectId}:progress`, content: `Progress ${progress}%`, metadata: { projectId, progress, updated_at: new Date().toISOString() } });
    } else {
      const newMeta = { ...(data.metadata ?? {}), progress, updated_at: new Date().toISOString() };
      await supabase.from('insights').update({ metadata: newMeta, content: `Progress ${progress}%` }).eq('id', data.id);
    }

    // Emit Cortex event for project progress
    try {
      const { emitEvent } = await import('../../cortex/eventEmitter');
      emitEvent({ type: 'feature_opportunity', signal: 'project_progress', module: 'projects', severity: 'low', hint: `project ${projectId} progress ${progress}%` });
    } catch (evErr) {
      // ignore
    }
  } catch (e) {
    console.error('[projects] update progress failed:', e?.message ?? e);
  }

  return { success: true };
}

export async function completeProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Fetch project to get XP reward
  const project = await getProjectById(projectId);
  const xp = (project?.xpReward ?? project?.metadata?.xpReward) ?? 100;

  try {
    // mark insight complete
    const { data, error } = await supabase.from('insights').select('id, metadata').eq('user_id', user.id).eq('title', `project:${projectId}:progress`).maybeSingle();
    if (data) {
      const newMeta = { ...(data.metadata ?? {}), progress: 100, completed_at: new Date().toISOString(), status: 'completed' };
      await supabase.from('insights').update({ metadata: newMeta, content: `Project ${projectId} completed` }).eq('id', data.id);
    } else {
      await supabase.from('insights').insert({ user_id: user.id, title: `project:${projectId}:progress`, content: `Project ${projectId} completed`, metadata: { projectId, progress: 100, completed_at: new Date().toISOString(), status: 'completed' } });
    }

    // Emit Cortex event for project completion
    try {
      const { emitEvent } = await import('../../cortex/eventEmitter');
      emitEvent({ type: 'feature_opportunity', signal: 'project_completed', module: 'projects', severity: 'medium', hint: `project ${projectId} completed by user ${user.id}` });
    } catch (evErr) {}
  } catch (e) {
    console.error('[projects] mark complete insight failed:', e?.message ?? e);
  }

  // Award XP
  try {
    await supabase.from('xp').insert({ user_id: user.id, amount: xp, source: 'project', project_id: projectId, created_at: new Date().toISOString() });
  } catch (e) {
    console.error('[projects] award xp failed:', e?.message ?? e);
  }

  return { success: true, xpAwarded: xp };
}
