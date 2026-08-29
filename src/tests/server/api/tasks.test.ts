import { test, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../../routes/api/tasks/+server';

// Mock users and their respective tasks
const user1 = { id: 'user-1-id', email: 'user1@example.com' };
const user2 = { id: 'user-2-id', email: 'user2@example.com' };

const user1Tasks = [
  { id: 'task-1', title: 'User 1 Task A', user_id: user1.id },
  { id: 'task-2', title: 'User 1 Task B', user_id: user1.id },
];
const user2Tasks = [
  { id: 'task-3', title: 'User 2 Task C', user_id: user2.id },
];

// Mock Supabase client
const mockSupabase = {
  from: vi.fn((tableName: string) => {
    if (tableName === 'tasks') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((column: string, value: string) => {
            if (column === 'user_id') {
              if (value === user1.id) {
                return { data: user1Tasks, error: null };
              } else if (value === user2.id) {
                return { data: user2Tasks, error: null };
              } else {
                return { data: [], error: null }; // No tasks for other user IDs
              }
            }
            return { data: [], error: null }; // Default empty if not user_id
          }),
        })),
      };
    }
    return { // Fallback for other tables if needed, ensure chainability
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ data: [], error: null }))
      }))
    };
  }),
};

// Mock locals.safeGetSession
let currentMockUser: typeof user1 | null = null;
const mockLocals = {
  safeGetSession: vi.fn(async () => ({ user: currentMockUser })),
};

vi.mock('$lib/server/supabaseClient', () => ({
  supabase: mockSupabase,
}));

vi.mock('$env/static/private', () => ({
  // Mock any environment variables if needed
}));

beforeEach(() => {
  currentMockUser = null; // Reset user before each test
  vi.clearAllMocks(); // Clear all mock states
});

test('authenticated user can retrieve their own tasks', async () => {
  currentMockUser = user1; // Simulate user1 logged in

  const response = await GET({ request: {} as Request, locals: mockLocals as any });
  const result = await response.json();

  expect(response.status).toBe(200);
  expect(result.tasks).toEqual(user1Tasks); // Expect tasks specific to user1
  expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
  expect(mockSupabase.from('tasks').select().eq).toHaveBeenCalledWith('user_id', user1.id);
});

test('authenticated user cannot retrieve another user\'s tasks (should only get their own)', async () => {
  currentMockUser = user2; // Simulate user2 logged in

  const response = await GET({ request: {} as Request, locals: mockLocals as any });
  const result = await response.json();

  expect(response.status).toBe(200);
  expect(result.tasks).toEqual(user2Tasks); // Expect tasks specific to user2
  expect(result.tasks.some(task => task.user_id === user1.id)).toBeFalsy(); // Ensure no user1 tasks
  expect(mockSupabase.from).toHaveBeenCalledWith('tasks');
  expect(mockSupabase.from('tasks').select().eq).toHaveBeenCalledWith('user_id', user2.id);
});

test('unauthenticated user cannot retrieve tasks', async () => {
  currentMockUser = null; // Simulate no user logged in

  const response = await GET({ request: {} as Request, locals: mockLocals as any });
  const result = await response.json();

  expect(response.status).toBe(401);
  expect(result.error).toBe('Unauthorized');
  expect(mockSupabase.from).not.toHaveBeenCalled(); // Database call should not happen for unauthorized access
});

test('API returns 500 on database error during task retrieval', async () => {
  currentMockUser = user1; // Simulate user1 logged in
  const errorMessage = 'Database query failed unexpectedly';

  // Temporarily override the mock for this specific test case to simulate an error
  mockSupabase.from.mockImplementationOnce(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: { message: errorMessage }
      }))
    }))
  }));

  const response = await GET({ request: {} as Request, locals: mockLocals as any });
  const result = await response.json();

  expect(response.status).toBe(500);
  expect(result.error).toBe(errorMessage);
  expect(mockSupabase.from).toHaveBeenCalledWith('tasks'); // Should still attempt DB call
});
