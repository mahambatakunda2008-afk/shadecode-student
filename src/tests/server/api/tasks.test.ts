import { test, expect, vi, beforeEach } from 'vitest';

// Rewritten from the ground up. The original version of this test (added by
// an automated Cortex agent pass, PR #251) imported '../../../routes/api/tasks/+server'
// and mocked '$lib/server/supabaseClient' / '$env/static/private' / a
// locals.safeGetSession() request shape -- all SvelteKit conventions that
// don't exist anywhere in this Next.js App Router codebase, and it targeted
// a GET /api/tasks list endpoint that has never existed here (tasks are
// fetched client-side via direct Supabase queries under RLS -- see
// src/app/(app)/tasks/page.tsx). It could not have passed typecheck, let
// alone actually exercised anything real.
//
// The one authorization boundary in this codebase that's actually relevant
// to "task API" is src/app/api/tasks/[id]/complete/route.js's PUT handler.
// While auditing it to write this test, found it was also a real,
// independent bug: createServerClient() there uses the Supabase
// service-role key with no session context, and the route called
// supabase.auth.getUser() with no token argument -- meaning it could never
// resolve a real user and would 401 every legitimate request. Fixed
// alongside this test to require and pass a Bearer token, matching every
// other authenticated route in this codebase. The route is currently
// unreachable from the real app (task completion happens client-side via
// direct Supabase + RLS instead), so this was a live-but-dead correctness
// bug, not a production regression -- fixing it here so this coverage
// tests real, correct behavior instead of enshrining the broken original.

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};

vi.mock('@/lib/supabaseClient', () => ({
  createServerClient: () => mockSupabase,
}));

vi.mock('@/lib/cortex', () => ({
  recordCortexInsight: vi.fn(async () => undefined),
}));

const owner = { id: 'user-1-id', email: 'owner@example.com' };
const otherUser = { id: 'user-2-id', email: 'other@example.com' };

function mockRequest(token: string | null) {
  return {
    headers: { get: (name: string) => (name.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : null) },
  } as unknown as Request;
}

function mockTaskUpdateChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn(async () => result);
  const select = vi.fn(() => ({ single }));
  const eqUser = vi.fn(() => ({ select }));
  const eqId = vi.fn(() => ({ eq: eqUser }));
  const update = vi.fn(() => ({ eq: eqId }));
  return { update, eqId, eqUser, select, single };
}

beforeEach(() => {
  vi.clearAllMocks();
});

test('unauthenticated request cannot complete a task', async () => {
  const { PUT } = await import('@/app/api/tasks/[id]/complete/route.js');
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

  const response = await PUT(mockRequest(null), { params: { id: 'task-1' } });
  const result = await response.json();

  expect(response.status).toBe(401);
  expect(result.error).toBe('Unauthorized');
  expect(mockSupabase.from).not.toHaveBeenCalled();
});

test('authenticated owner can complete their own task', async () => {
  const { PUT } = await import('@/app/api/tasks/[id]/complete/route.js');
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: owner } });
  const chain = mockTaskUpdateChain({ data: { id: 'task-1', title: 'Task', user_id: owner.id, completed: true }, error: null });
  mockSupabase.from.mockReturnValue({ update: chain.update });

  const response = await PUT(mockRequest('owner-token'), { params: { id: 'task-1' } });
  const result = await response.json();

  expect(response.status).toBe(200);
  expect(result.user_id).toBe(owner.id);
  expect(mockSupabase.auth.getUser).toHaveBeenCalledWith('owner-token');
  expect(chain.eqId).toHaveBeenCalledWith('id', 'task-1');
  expect(chain.eqUser).toHaveBeenCalledWith('user_id', owner.id);
});

test('authenticated user cannot complete another user\'s task', async () => {
  const { PUT } = await import('@/app/api/tasks/[id]/complete/route.js');
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: otherUser } });
  // The route scopes its update with .eq('user_id', user.id); a task owned
  // by someone else won't match that filter, so Supabase returns no row.
  const chain = mockTaskUpdateChain({ data: null, error: null });
  mockSupabase.from.mockReturnValue({ update: chain.update });

  const response = await PUT(mockRequest('other-token'), { params: { id: 'task-1' } });
  const result = await response.json();

  expect(response.status).toBe(404);
  expect(result.error).toBe('Task not found or unauthorized to update');
  expect(chain.eqUser).toHaveBeenCalledWith('user_id', otherUser.id);
});

test('API returns 500 on database error during task completion', async () => {
  const { PUT } = await import('@/app/api/tasks/[id]/complete/route.js');
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: owner } });
  const chain = mockTaskUpdateChain({ data: null, error: { message: 'Database query failed unexpectedly' } });
  mockSupabase.from.mockReturnValue({ update: chain.update });

  const response = await PUT(mockRequest('owner-token'), { params: { id: 'task-1' } });
  const result = await response.json();

  expect(response.status).toBe(500);
  expect(result.error).toBe('Failed to complete task');
});
