import { test, expect, vi, beforeEach } from 'vitest';

// Coverage for src/app/api/tasks/[id]/route.ts, rewritten from PR #258's
// original submission. That version was written entirely for Next.js Pages
// Router (NextApiRequest/NextApiResponse, req.query, res.status().json()),
// lived outside src/app/api entirely (src/server/api/tasks/[taskId].ts,
// not a real Next.js route location), and imported the deprecated
// @supabase/auth-helpers-nextjs package this codebase doesn't use anywhere
// else. Rewritten as a real App Router route matching this codebase's
// established pattern (see src/app/api/tasks/[id]/complete/route.js):
// createServerClient() + Bearer-token auth, with ownership enforced
// directly in the query filter (.eq('user_id', user.id)) rather than a
// separate fetch-then-check step.

const mockSupabase = { auth: { getUser: vi.fn() }, from: vi.fn() };

vi.mock('@/lib/supabaseClient', () => ({ createServerClient: () => mockSupabase }));

const owner = { id: 'user-1-id', email: 'owner@example.com' };
const otherUser = { id: 'user-2-id', email: 'other@example.com' };

function mockRequest(token: string | null, body?: unknown) {
  return {
    headers: { get: (name: string) => (name.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : null) },
    json: async () => body,
  } as unknown as Request;
}

function mockParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function mockSelectChain(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn(async () => result);
  const eqUser = vi.fn(() => ({ maybeSingle }));
  const eqId = vi.fn(() => ({ eq: eqUser }));
  const select = vi.fn(() => ({ eq: eqId }));
  return { select, eqId, eqUser, maybeSingle };
}

function mockUpdateChain(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn(async () => result);
  const select = vi.fn(() => ({ maybeSingle }));
  const eqUser = vi.fn(() => ({ select }));
  const eqId = vi.fn(() => ({ eq: eqUser }));
  const update = vi.fn(() => ({ eq: eqId }));
  return { update, eqId, eqUser, select, maybeSingle };
}

beforeEach(() => {
  vi.clearAllMocks();
});

test('GET rejects an unauthenticated request', async () => {
  const { GET } = await import('@/app/api/tasks/[id]/route');
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

  const response = await GET(mockRequest(null), mockParams('task-1'));
  expect(response.status).toBe(401);
});

test('GET returns a task the caller owns', async () => {
  const { GET } = await import('@/app/api/tasks/[id]/route');
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: owner } });
  const chain = mockSelectChain({ data: { id: 'task-1', title: 'Task', user_id: owner.id }, error: null });
  mockSupabase.from.mockReturnValue({ select: chain.select });

  const response = await GET(mockRequest('owner-token'), mockParams('task-1'));
  const result = await response.json();

  expect(response.status).toBe(200);
  expect(result.user_id).toBe(owner.id);
  expect(chain.eqUser).toHaveBeenCalledWith('user_id', owner.id);
});

test("GET returns 404 for another user's task, not 403 (avoids leaking existence)", async () => {
  const { GET } = await import('@/app/api/tasks/[id]/route');
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: otherUser } });
  const chain = mockSelectChain({ data: null, error: null });
  mockSupabase.from.mockReturnValue({ select: chain.select });

  const response = await GET(mockRequest('other-token'), mockParams('task-1'));
  expect(response.status).toBe(404);
});

test('PUT rejects an unauthenticated request', async () => {
  const { PUT } = await import('@/app/api/tasks/[id]/route');
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });

  const response = await PUT(mockRequest(null, { title: 'New' }), mockParams('task-1'));
  expect(response.status).toBe(401);
});

test('PUT updates a task the caller owns', async () => {
  const { PUT } = await import('@/app/api/tasks/[id]/route');
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: owner } });
  const chain = mockUpdateChain({ data: { id: 'task-1', title: 'Updated', user_id: owner.id }, error: null });
  mockSupabase.from.mockReturnValue({ update: chain.update });

  const response = await PUT(mockRequest('owner-token', { title: 'Updated' }), mockParams('task-1'));
  const result = await response.json();

  expect(response.status).toBe(200);
  expect(result.title).toBe('Updated');
  expect(chain.eqUser).toHaveBeenCalledWith('user_id', owner.id);
});

test("PUT cannot update another user's task", async () => {
  const { PUT } = await import('@/app/api/tasks/[id]/route');
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: otherUser } });
  const chain = mockUpdateChain({ data: null, error: null });
  mockSupabase.from.mockReturnValue({ update: chain.update });

  const response = await PUT(mockRequest('other-token', { title: 'Hijacked' }), mockParams('task-1'));
  expect(response.status).toBe(404);
  expect(chain.eqUser).toHaveBeenCalledWith('user_id', otherUser.id);
});
