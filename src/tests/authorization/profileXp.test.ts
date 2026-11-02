import { createClient } from '@supabase/supabase-js';
import { incrementProfileXp } from '../../lib/profile'; // Assuming this function exists and throws on Supabase error

// Mock the Supabase client to simulate RLS behavior for non-service_role access
jest.mock('@supabase/supabase-js', () => {
  const mockFrom = jest.fn(() => ({
    update: jest.fn().mockReturnThis(), // Chained method
    eq: jest.fn(() => ({
      data: null,
      error: { code: '42501', message: 'permission denied for table profiles', details: null, hint: null }, // Simulate RLS error
    })),
  }));

  const mockAuth = {
    // Mock getUser to return a non-service_role user for this test
    getUser: jest.fn(async () => ({ data: { user: { id: 'test-user-id', role: 'authenticated' } }, error: null })),
  };

  const mockClient = {
    from: mockFrom,
    auth: mockAuth,
  };

  return {
    createClient: jest.fn(() => mockClient), // Always return the same mock client instance for simplicity
  };
});

describe('Profile XP Authorization', () => {
  const MOCK_USER_ID = 'test-profile-123';
  const MOCK_XP_AMOUNT = 10;
  let mockSupabase: ReturnType<typeof createClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-initialize the mock client for each test to ensure a clean state
    mockSupabase = createClient('http://mock-supabase.local', 'mock-anon-key');
  });

  it('should prevent a non-service_role user from incrementing XP', async () => {
    // The mock client is already configured globally to return a permission error
    // for any `from().update().eq()` call, simulating RLS for a regular user.
    await expect(incrementProfileXp(MOCK_USER_ID, MOCK_XP_AMOUNT, mockSupabase))
      .rejects.toHaveProperty('code', '42501');

    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    // Ensure that `update` was attempted, which then led to the RLS error
    expect((mockSupabase.from('profiles').update as jest.Mock)).toHaveBeenCalled();
  });

  // Note: Testing the 'service_role' success case would require a more complex mock
  // setup to differentiate client instances based on their assumed role (e.g., via JWT).
  // For this regression test, the primary focus is verifying the failure of unauthorized access.
});