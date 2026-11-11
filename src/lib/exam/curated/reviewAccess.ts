import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ReviewerContext {
  supabase: SupabaseClient;
  user: User;
}

/** Admins and teachers may review. Returns null for everyone else, including signed-out visitors. */
export async function getReviewer(): Promise<ReviewerContext | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  for (const role_name of ["teacher", "admin"]) {
    const { data, error } = await supabase.rpc("has_role", { user_id: user.id, role_name });
    if (!error && data === true) return { supabase, user };
  }
  return null;
}
