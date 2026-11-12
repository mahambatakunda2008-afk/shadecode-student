/**
 * src/lib/supabase/admin.ts
 *
 * Service-role client for server routes that must read data clients may never
 * see (battle answer keys). Never import this from client components.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type AccountDeletionWriteGate =
  | { allowed: true }
  | { allowed: false; status: 423 | 503; code: "ACCOUNT_DELETION_PENDING" | "ACCOUNT_STATE_UNAVAILABLE"; message: string };

/**
 * Service-role routes must explicitly check the verified caller's deletion
 * state because service-role SQL sessions bypass caller-scoped RLS/triggers.
 * Fail closed when the queue cannot be inspected.
 */
export async function checkAccountDeletionWriteGate(
  client: SupabaseClient,
  userId: string,
): Promise<AccountDeletionWriteGate> {
  const { data, error } = await client
    .from("account_deletion_requests")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["pending", "processing", "failed"])
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      allowed: false,
      status: 503,
      code: "ACCOUNT_STATE_UNAVAILABLE",
      message: "Account state could not be verified. Please retry later.",
    };
  }
  if (data) {
    return {
      allowed: false,
      status: 423,
      code: "ACCOUNT_DELETION_PENDING",
      message: "Account changes are disabled while deletion is pending.",
    };
  }
  return { allowed: true };
}
