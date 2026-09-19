import { createServerClient } from '@supabase/ssr';
import handler from '../profile'; // Assuming the profile API handler is in src/api/profile.ts
import { NextApiRequest, NextApiResponse } from 'next';

// Mock Supabase client to control auth state and database responses
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  })),
}));

const mockSupabase = createServerClient as jest.MockedFunction<typeof createServerClient>;
const mockGetUser = jest.fn();
const mockSelectEqSingle = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  // Reset mocks for each test to ensure isolation
  mockSupabase.mockReturnValue({
    auth: {
      getUser: mockGetUser,
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: mockSelectEqSingle,
        })),
      })),
    })),
  } as any); // Type assertion needed due to deep mocking
});

describe('Profile API Authorization Boundaries', () => {
  const userAId = 'uuid-user-a-123';
  const userBId = 'uuid-user-b-456';

  const userAProfile = {
    id: userAId,
    username: 'alice_shadecode',
    email: 'alice@shadecode.com',
    avatar_url: null,
  };

  const mockResponse = () => {
    const res: Partial<NextApiResponse> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn(),
    };
    return res as NextApiResponse;
  };

  it('should prevent unauthenticated access to the profile', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const req = { method: 'GET' } as NextApiRequest;
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(mockSelectEqSingle).not.toHaveBeenCalled(); // No database query should occur without authentication
  });

  it('should allow an authenticated user to fetch their own profile', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userAId } } });
    mockSelectEqSingle.mockResolvedValue({ data: userAProfile, error: null });

    const req = { method: 'GET' } as NextApiRequest;
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(userAProfile);
    // Ensure the database query was for the authenticated user's ID
    expect(mockSupabase().from).toHaveBeenCalledWith('profiles');
    expect(mockSupabase().from('profiles').select().eq).toHaveBeenCalledWith('id', userAId);
  });

  it('should return 404 if an authenticated user\'s profile is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: userAId } } });
    mockSelectEqSingle.mockResolvedValue({ data: null, error: null }); // Simulate profile not found in DB

    const req = { method: 'GET' } as NextApiRequest;
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Profile not found' });
    expect(mockSupabase().from('profiles').select().eq).toHaveBeenCalledWith('id', userAId);
  });

  it('should strictly fetch only the authenticated user\'s profile, ignoring external IDs in query', async () => {
    // Authenticate as User A
    mockGetUser.mockResolvedValue({ data: { user: { id: userAId } } });
    mockSelectEqSingle.mockResolvedValue({ data: userAProfile, error: null });

    // Malicious attempt: Request for User B's profile while authenticated as User A
    const req = {
      method: 'GET',
      query: { id: userBId }, // Attacker tries to specify another user's ID in query parameters
    } as unknown as NextApiRequest; // Cast as unknown first to satisfy type checking for adding 'query'
    const res = mockResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(userAProfile);
    // CRITICAL: Ensure the handler only queried for User A's ID, despite the malicious 'id' in query
    expect(mockSupabase().from('profiles').select().eq).toHaveBeenCalledWith('id', userAId);
    expect(mockSupabase().from('profiles').select().eq).not.toHaveBeenCalledWith('id', userBId); // Confirm no query for B
  });
});
