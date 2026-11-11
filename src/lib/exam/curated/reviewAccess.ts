import "server-only";
import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ReviewerContext {
  supabase: SupabaseClient;
  user: User;
  isAdmin: boolean;
  isTeacher: boolean;
}

/**
 * Admins and teachers may use the teacher portal. Returns null for everyone else, including signed-out visitors.
 * Cached per request so the layout and the page do not repeat the role checks.
 */
export const getReviewer = cache(async (): Promise<ReviewerContext | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [teacher, admin] = await Promise.all([
    supabase.rpc("has_role", { user_id: user.id, role_name: "teacher" }),
    supabase.rpc("has_role", { user_id: user.id, role_name: "admin" }),
  ]);
  const isTeacher = !teacher.error && teacher.data === true;
  const isAdmin = !admin.error && admin.data === true;
  if (!isTeacher && !isAdmin) return null;
  return { supabase, user, isAdmin, isTeacher };
});
