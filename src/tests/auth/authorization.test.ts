import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
// Assumes src/services/taskService.ts exists and exports getTaskById
// The implementation of getTaskById is expected to include a user_id filter.
import { getTaskById } from '../../services/taskService'; 

// Mock Supabase client to control database interactions and user authentication status
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
        single: vi.fn(), // For queries with only one .eq() clause (e.g., initial ID check without user_id)
      })),
    })),
  })),
};

// Mock the createClient function from @supabase/supabase-js
// This ensures that any call to createClient within the service uses our mock instance.
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('Authorization Boundaries for Tasks', () => {
  const USER_ID_1 = '00000000-0000-0000-0000-000000000001';
  const USER_ID_2 = '00000000-0000-0000-0000-000000000002';
  const TASK_ID_OWNED_BY_1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const TASK_ID_OWNED_BY_2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  beforeEach(() => {
    // Clear all mocks before each test to ensure test isolation
    vi.clearAllMocks();
    // Default mock for getUser assumes USER_ID_1 is logged in for most tests
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: USER_ID_1 } },
      error: null
    });
  });

  it('should allow a user to retrieve their own task', async () => {
    // Simulate the Supabase query chain: 
    // .from('tasks').select('*').eq('id', TASK_ID_OWNED_BY_1).eq('user_id', USER_ID_1).single()
    mockSupabaseClient.from().select().eq.mockImplementationOnce((column, value) => {
        if (column === 'id' && value === TASK_ID_OWNED_BY_1) {
            return {
                eq: vi.fn((userColumn, userValue) => {
                    if (userColumn === 'user_id' && userValue === USER_ID_1) {
                        return { single: vi.fn(() => Promise.resolve({
                            data: { id: TASK_ID_OWNED_BY_1, user_id: USER_ID_1, title: 'My Task 1' },
                            error: null
                        })) };
                    }
                    // If user_id filter is incorrect, simulate no rows found
                    return { single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found', details: '', hint: '' } })) };
                })
            };
        }
        return { single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found', details: '', hint: '' } })) };
    });

    const task = await getTaskById(TASK_ID_OWNED_BY_1);

    expect(task).toBeDefined();
    expect(task?.id).toBe(TASK_ID_OWNED_BY_1);
    expect(task?.user_id).toBe(USER_ID_1);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('tasks');
    expect(mockSupabaseClient.from().select().eq).toHaveBeenCalledWith('id', TASK_ID_OWNED_BY_1);
    // Crucially, verify that the user_id filter was applied
    expect(mockSupabaseClient.from().select().eq().eq).toHaveBeenCalledWith('user_id', USER_ID_1);
  });

  it('should prevent a user from retrieving a task owned by another user', async () => {
    // Simulate the Supabase query chain: 
    // .from('tasks').select('*').eq('id', TASK_ID_OWNED_BY_2).eq('user_id', USER_ID_1).single()
    // This combined query should yield null because TASK_ID_OWNED_BY_2 belongs to USER_ID_2.
    mockSupabaseClient.from().select().eq.mockImplementationOnce((column, value) => {
        if (column === 'id' && value === TASK_ID_OWNED_BY_2) {
            return {
                eq: vi.fn((userColumn, userValue) => {
                    if (userColumn === 'user_id' && userValue === USER_ID_1) {
                        // This specific combination (ID of another user's task AND current user's ID) should return no data
                        return { single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found', details: '', hint: '' } })) };
                    }
                    return { single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found', details: '', hint: '' } })) };
                })
            };
        }
        return { single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'No rows found', details: '', hint: '' } })) };
    });

    const task = await getTaskById(TASK_ID_OWNED_BY_2);

    expect(task).toBeNull();
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('tasks');
    expect(mockSupabaseClient.from().select().eq).toHaveBeenCalledWith('id', TASK_ID_OWNED_BY_2);
    expect(mockSupabaseClient.from().select().eq().eq).toHaveBeenCalledWith('user_id', USER_ID_1);
  });

  it('should return null if no user is authenticated', async () => {
    // Mock that no user is currently authenticated
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null
    });
    const task = await getTaskById(TASK_ID_OWNED_BY_1);
    expect(task).toBeNull();
    // Verify that no database call was made if there's no authenticated user
    expect(mockSupabaseClient.from).not.toHaveBeenCalled(); 
  });
});
