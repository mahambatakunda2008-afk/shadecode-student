import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables for Supabase URL and keys, typically from a .env.test file
dotenv.config({ path: '.env.test' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'; // Default for local Supabase setup
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'; // Replace with a valid test anon key
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY'; // Replace with a valid test service key

// Helper function to create an authenticated Supabase client for a test user
async function createAuthenticatedClient(email: string, password = 'password123'): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  
  // Attempt to sign up the user. If they already exist, proceed to sign in.
  const { error: signUpError } = await client.auth.signUp({
    email,
    password,
  });

  if (signUpError && signUpError.message !== 'User already registered') {
    throw new Error(`Failed to sign up user ${email}: ${signUpError.message}`);
  }

  // Sign in the user
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Failed to sign in user ${email}: ${signInError.message}`);
  }

  if (signInData.session) {
    client.auth.setSession(signInData.session);
  }
  return client;
}

// Helper function to create a Supabase client with service role for setup/teardown
function createServiceRoleClient(): SupabaseClient {
  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_KEY') {
    throw new Error('SUPABASE_SERVICE_KEY is required and must be configured for the service role client.');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }, // Do not persist session for service role client
  });
}

describe('Authorization Boundaries for Tasks', () => {
  let user1Client: SupabaseClient;
  let user2Client: SupabaseClient;
  let serviceRoleClient: SupabaseClient;

  const user1Email = `user1-${Date.now()}@shadecode.com`;
  const user2Email = `user2-${Date.now()}@shadecode.com`;
  let user1TaskId: string | null = null;

  beforeAll(async () => {
    serviceRoleClient = createServiceRoleClient();

    // Clean up any lingering test users from previous runs using service_role for robustness
    await serviceRoleClient.auth.admin.deleteUser(user1Email).catch(() => {});
    await serviceRoleClient.auth.admin.deleteUser(user2Email).catch(() => {});
    await serviceRoleClient.from('profiles').delete().eq('email', user1Email);
    await serviceRoleClient.from('profiles').delete().eq('email', user2Email);

    user1Client = await createAuthenticatedClient(user1Email);
    user2Client = await createAuthenticatedClient(user2Email);
  }, 30000); // Increased timeout for async auth operations

  afterAll(async () => {
    // Clean up test data and users using service_role client
    if (user1TaskId) {
      await serviceRoleClient.from('tasks').delete().eq('id', user1TaskId);
    }
    // Ensure user clients have a session before attempting to get ID for deletion
    const user1AuthUser = await user1Client.auth.getUser();
    const user2AuthUser = await user2Client.auth.getUser();

    if (user1AuthUser.data.user) {
        await serviceRoleClient.auth.admin.deleteUser(user1AuthUser.data.user.id);
    }
    if (user2AuthUser.data.user) {
        await serviceRoleClient.auth.admin.deleteUser(user2AuthUser.data.user.id);
    }
    await serviceRoleClient.from('profiles').delete().eq('email', user1Email);
    await serviceRoleClient.from('profiles').delete().eq('email', user2Email);
  });

  it('User 1 should be able to create and retrieve their own task', async () => {
    const { data: user1AuthData, error: authError } = await user1Client.auth.getUser();
    if (authError || !user1AuthData.user) {
        throw authError || new Error('User 1 not authenticated');
    }

    const { data: user1ProfileData, error: profileError } = await user1Client.from('profiles').select('id').eq('user_id', user1AuthData.user.id).single();
    if (profileError) {
        throw profileError;
    }
    const user1ProfileId = user1ProfileData.id;

    const { data, error } = await user1Client
      .from('tasks')
      .insert({
        title: 'User 1\'s private task',
        description: 'This task belongs only to user 1',
        due_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        user_id: user1AuthData.user.id, // Link task to auth.users.id
        is_completed: false,
      })
      .select('id')
      .single();

    expect(error).toBeNull();
    expect(data).toHaveProperty('id');
    user1TaskId = data!.id; // Store ID for later cleanup and testing

    const { data: retrievedTask, error: retrieveError } = await user1Client
      .from('tasks')
      .select('*')
      .eq('id', user1TaskId)
      .single();

    expect(retrieveError).toBeNull();
    expect(retrievedTask).toBeDefined();
    expect(retrievedTask!.title).toBe('User 1\'s private task');
  });

  it('User 2 should NOT be able to retrieve User 1\'s task', async () => {
    expect(user1TaskId).not.toBeNull(); // Ensure task was created by User 1

    // Attempt to retrieve User 1's task as User 2
    const { data, error } = await user2Client
      .from('tasks')
      .select('*')
      .eq('id', user1TaskId!); // Query for a specific ID

    // If RLS is properly configured for SELECT, the query should return an empty array
    // as User 2 does not have permission to view User 1's task.
    expect(error).toBeNull(); // No error is expected, just no results
    expect(data).toEqual([]); // Assert that no tasks were retrieved for User 2
  });

  it('User 2 should NOT be able to update User 1\'s task', async () => {
    expect(user1TaskId).not.toBeNull();

    // Attempt to update User 1's task as User 2
    const { data, error } = await user2Client
      .from('tasks')
      .update({ title: 'User 2 trying to modify task' })
      .eq('id', user1TaskId!); // Attempt to update a specific ID

    // If RLS is properly configured for UPDATE, the query should return an empty array
    // indicating that no rows were updated by User 2.
    expect(error).toBeNull(); // No error is expected, just no rows affected
    expect(data).toEqual([]); // Assert that no tasks were updated
  });

  it('User 2 should NOT be able to delete User 1\'s task', async () => {
    expect(user1TaskId).not.toBeNull();

    // Attempt to delete User 1's task as User 2
    const { data, error } = await user2Client
      .from('tasks')
      .delete()
      .eq('id', user1TaskId!); // Attempt to delete a specific ID

    // If RLS is properly configured for DELETE, the query should return an empty array
    // indicating that no rows were deleted by User 2.
    expect(error).toBeNull(); // No error is expected, just no rows affected
    expect(data).toEqual([]); // Assert that no tasks were deleted
  });
});
