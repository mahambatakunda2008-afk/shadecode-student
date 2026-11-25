import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { incrementUserXP } from '../profiles'; // Assuming this is where it lives

// Mock the Supabase client used by `src/lib/profiles.ts`
vi.mock('@supabase/supabase-js', () => {
  const mockRpc = vi.fn();
  const mockAuth = {
    getUser: vi.fn(),
  };
  return {
    createClient: vi.fn(() => ({
      rpc: mockRpc,
      auth: mockAuth,
    })),
  };
});

const mockSupabase = {
  rpc: vi.mocked(createClient('', '').rpc), // Cast to MockedFunction to access mock methods
  auth: {
    getUser: vi.mocked(createClient('', '').auth.getUser), // Cast to MockedFunction
  },
};

describe('Authorization Boundaries - incrementUserXP', () => {
  const testUserId = 'test-user-123';
  const xpAmount = 10;
  const policyViolationError = {
    message: 'Policy Violation: Row-level security prevented the operation.',
    code: '42501', // Common SQLSTATE for insufficient privilege
    details: '',
    hint: '',
  };

  beforeEach(() => {
    // Clear all mocks before each test to ensure isolation
    vi.clearAllMocks();
    // Default `getUser` to return no user, unless explicitly set otherwise in a test
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it('should prevent an unauthenticated user from incrementing XP via client-side function', async () => {
    // Mock the RPC call to simulate an RLS policy violation for non-service_role access
    mockSupabase.rpc.mockResolvedValue({ data: null, error: policyViolationError });

    const result = await incrementUserXP(testUserId, xpAmount);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Policy Violation');
    // Verify that the RPC was attempted with the correct arguments
    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_xp', { user_id: testUserId, amount: xpAmount });
  });

  it('should prevent an authenticated regular user from incrementing XP via client-side function', async () => {
    // Simulate an authenticated user, but not a service_role
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'some-regular-user-id',
          email: 'user@example.com',
          role: 'authenticated', // Standard user role
          app_metadata: {}, user_metadata: {}, created_at: '', updated_at: ''
        }
      },
      error: null
    });
    // Mock the RPC call to simulate an RLS policy violation even for authenticated users
    mockSupabase.rpc.mockResolvedValue({ data: null, error: policyViolationError });

    const result = await incrementUserXP(testUserId, xpAmount);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Policy Violation');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_xp', { user_id: testUserId, amount: xpAmount });
  });

  // Note: A 'success' test for service_role would typically involve a *different* Supabase client
  // initialized with the service_role key, or testing a server-side function that utilizes such a client.
  // This test focuses on the client-side `incrementUserXP` function, which, as a 'service-role only'
  // RPC, should consistently fail when called from a browser context using the anon key.
});
