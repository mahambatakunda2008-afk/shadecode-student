import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * RBAC (Role-Based Access Control) Middleware
 * Provides functions to check user permissions and roles
 */

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase server credentials.');
  return createSupabaseClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Check if a user has a specific role
 * @param userId - The user's UUID
 * @param roleName - The role name to check (e.g., 'admin', 'moderator')
 * @returns Promise<boolean> - True if user has the role
 */
export async function hasUserRole(userId: string, roleName: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('has_role', {
      user_id: userId,
      role_name: roleName
    });
    
    if (error) {
      console.error('[RBAC] Error checking user role:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('[RBAC] Error checking user role:', error);
    return false;
  }
}

/**
 * Check if a user has a specific permission
 * @param userId - The user's UUID
 * @param permission - The permission to check (e.g., 'approve_drafts')
 * @returns Promise<boolean> - True if user has the permission
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('has_permission', {
      user_id: userId,
      permission: permission
    });
    
    if (error) {
      console.error('[RBAC] Error checking user permission:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('[RBAC] Error checking user permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a user
 * @param userId - The user's UUID
 * @returns Promise<Record<string, boolean>> - Object with all user permissions
 */
export async function getUserPermissions(userId: string): Promise<Record<string, boolean>> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('get_user_permissions', {
      user_id: userId
    });
    
    if (error) {
      console.error('[RBAC] Error getting user permissions:', error);
      return {};
    }
    
    return data || {};
  } catch (error) {
    console.error('[RBAC] Error getting user permissions:', error);
    return {};
  }
}

/**
 * Middleware function to check if user has required permission
 * Returns 403 if permission check fails
 * @param req - The request object
 * @param permission - The required permission
 * @returns Response object if check fails, null if check passes
 */
export async function requirePermission(
  req: Request,
  permission: string
): Promise<Response | null> {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.slice(7);
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user has the required permission
    const hasRequiredPermission = await hasPermission(user.id, permission);
    
    if (!hasRequiredPermission) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Permission check passed
    return null;
  } catch (error) {
    console.error('[RBAC] Error in requirePermission middleware:', error);
    return new Response(JSON.stringify({ error: 'Authorization check failed' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Middleware function to check if user has required role
 * Returns 403 if role check fails
 * @param req - The request object
 * @param roleName - The required role name
 * @returns Response object if check fails, null if check passes
 */
export async function requireRole(
  req: Request,
  roleName: string
): Promise<Response | null> {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.slice(7);
    const supabase = getSupabaseAdmin();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user has the required role
    const hasRequiredRole = await hasUserRole(user.id, roleName);
    
    if (!hasRequiredRole) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Role check passed
    return null;
  } catch (error) {
    console.error('[RBAC] Error in requireRole middleware:', error);
    return new Response(JSON.stringify({ error: 'Authorization check failed' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Helper function to extract user ID from request
 * @param req - The request object
 * @returns Promise<string | null> - User ID or null if not authenticated
 */
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.slice(7);
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('[RBAC] Error extracting user ID:', error);
    return null;
  }
}
