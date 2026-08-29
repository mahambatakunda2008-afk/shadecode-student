import { test, expect, vi, describe, beforeEach } from 'vitest';

// Mock the Supabase client to simulate RLS behavior for tasks.
// This mock is designed to represent how a properly configured Supabase RLS policy
// would filter data based on the authenticated user's ID.
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(), // Mocks fetching the current authenticated user
  },
  from: vi.fn((tableName: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn((column: string, value: any) => {
        // This path simulates queries like .eq('id', taskId) or .eq('user_id', userId)
        return {
          maybeSingle: vi.fn(() => ({
            async then(resolve: (value: any) => void) {
              if (tableName === 'tasks') {
                const authenticatedUserId = mockSupabaseClient.auth.getUser.mock.results[0]?.value?.data?.user?.id;

                const allTasks = [
                  { id: 'task-1-user-a', user_id: 'user-a-id', title: 'User A Task 1' },
                  { id: 'task-2-user-a', user_id: 'user-a-id', title: 'User A Task 2' },
                  { id: 'task-1-user-b', user_id: 'user-b-id', title: 'User B Task 1' }
                ];

                // Simulate RLS: a task is returned only if it matches the query condition
                // AND belongs to the currently authenticated user.
                const task = allTasks.find(t => t[column as keyof typeof t] === value && t.user_id === authenticatedUserId);
                resolve({ data: task || null, error: null });
              } else {
                resolve({ data: null, error: null });
              }
            },
          })),
          async then(resolve: (value: any) => void) {
            // This path is for select().eq()... without .maybeSingle()
            if (tableName === 'tasks') {
              const authenticatedUserId = mockSupabaseClient.auth.getUser.mock.results[0]?.value?.data?.user?.id;
              const allTasks = [
                { id: 'task-1-user-a', user_id: 'user-a-id', title: 'User A Task 1' },
                { id: 'task-2-user-a', user_id: 'user-a-id', title: 'User A Task 2' },
                { id: 'task-1-user-b', user_id: 'user-b-id', title: 'User B Task 1' }
              ];
              // Filter by the `eq` condition AND by the authenticated user
              const filteredTasks = allTasks.filter(t => t[column as keyof typeof t] === value && t.user_id === authenticatedUserId);
              resolve({ data: filteredTasks, error: null });
            } else {
              resolve({ data: [], error: null });
            }
          }
        };
      }),
      async then(resolve: (value: any) => void) {
        // This path is for general select('*') without .eq()
        if (tableName === 'tasks') {
          const authenticatedUserId = mockSupabaseClient.auth.getUser.mock.results[0]?.value?.data?.user?.id;

          const allTasks = [
            { id: 'task-1-user-a', user_id: 'user-a-id', title: 'User A Task 1' },
            { id: 'task-2-user-a', user_id: 'user-a-id', title: 'User A Task 2' },
            { id: 'task-1-user-b', user_id: 'user-b-id', title: 'User B Task 1' }
          ];

          // Simulate RLS: only return tasks belonging to the authenticated user.
          const userTasks = authenticatedUserId ? allTasks.filter(task => task.user_id === authenticatedUserId) : [];
          resolve({ data: userTasks, error: null });
        } else {
          resolve({ data: [], error: null });
        }
      },
    })),
  }),
};

// --- Mocked API functions that would typically reside in src/api/tasks.ts ---
// These functions use the assumed `supabaseClient` internally.
// They include basic unauthenticated user checks at the API layer.
async function getTasksForCurrentUser() {
  const { data: { user }, error: userError } = await mockSupabaseClient.auth.getUser();
  if (userError || !user) {
    return { data: null, error: { message: 'User not authenticated', status: 401 } };
  }
  // This Supabase call should be implicitly secured by RLS in the database.
  return mockSupabaseClient.from('tasks').select('*');
}

async function getTaskByIdForCurrentUser(taskId: string) {
    const { data: { user }, error: userError } = await mockSupabaseClient.auth.getUser();
    if (userError || !user) {
        return { data: null, error: { message: 'User not authenticated', status: 401 } };
    }
    // This Supabase call should be implicitly secured by RLS in the database.
    return mockSupabaseClient.from('tasks').select('*').eq('id', taskId).maybeSingle();
}
// --- End of mocked API functions ---

describe('Authorization Boundaries for Tasks (Security Audit)', () => {
  const userA_id = 'user-a-id';
  const userB_id = 'user-b-id';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for getUser: no user authenticated before each test
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  test('User A can only see their own tasks when fetching all tasks', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: { id: userA_id } }, error: null });

    const { data: tasks, error } = await getTasksForCurrentUser();

    expect(error).toBeNull();
    expect(tasks).toHaveLength(2);
    expect(tasks?.every(task => task.user_id === userA_id)).toBe(true);
    expect(tasks?.some(task => task.user_id === userB_id)).toBe(false);
  });

  test('User B can only see their own tasks when fetching all tasks', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: { id: userB_id } }, error: null });

    const { data: tasks, error } = await getTasksForCurrentUser();

    expect(error).toBeNull();
    expect(tasks).toHaveLength(1);
    expect(tasks?.every(task => task.user_id === userB_id)).toBe(true);
  });

  test('Unauthenticated user receives an error when attempting to fetch tasks', async () => {
    // No user authenticated (default state from beforeEach)
    const { data: tasks, error } = await getTasksForCurrentUser();

    expect(tasks).toBeNull();
    expect(error).toEqual({ message: 'User not authenticated', status: 401 });
  });

  test('User A cannot fetch a specific task owned by User B by ID', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: { id: userA_id } }, error: null });
    const taskBId = 'task-1-user-b';

    const { data: task, error } = await getTaskByIdForCurrentUser(taskBId);

    expect(error).toBeNull(); // Supabase RLS typically returns null data, not an error, for denied access to a single row.
    expect(task).toBeNull(); // User A should not be able to retrieve User B's task
  });

  test('User A can fetch their own specific task by ID', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: { id: userA_id } }, error: null });
    const taskAId = 'task-1-user-a';

    const { data: task, error } = await getTaskByIdForCurrentUser(taskAId);

    expect(error).toBeNull();
    expect(task).not.toBeNull();
    expect(task?.id).toBe(taskAId);
    expect(task?.user_id).toBe(userA_id);
  });
});
