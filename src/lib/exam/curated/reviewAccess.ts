import "server-only";
import { cache } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const INSTITUTION_TEACHING_ROLES = ["teacher", "tutor", "administrator", "staff"] as const;

export interface TeacherWorkspaceContext {
  supabase: SupabaseClient;
  user: User;
  isAdmin: boolean;
  isTeacher: boolean;
  isInstitutionStaff: boolean;
  canReviewContent: boolean;
}

export interface ReviewerContext {
  supabase: SupabaseClient;
  user: User;
  isAdmin: boolean;
  isTeacher: boolean;
}

/**
 * Access to the dedicated Teacher Client can come from either a global
 * Shadecode teacher/admin role or an active, institution-scoped teaching role.
 * Institution membership never grants global content-review privileges.
 */
export const getTeacherWorkspace = cache(async (): Promise<TeacherWorkspaceContext | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [teacher, admin, institutionMemberships] = await Promise.all([
    supabase.rpc("has_role", { user_id: user.id, role_name: "teacher" }),
    supabase.rpc("has_role", { user_id: user.id, role_name: "admin" }),
    supabase
      .from("platform_institution_members")
      .select("institution_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("membership_role", [...INSTITUTION_TEACHING_ROLES]),
  ]);

  const isTeacher = !teacher.error && teacher.data === true;
  const isAdmin = !admin.error && admin.data === true;
  const isInstitutionStaff = !institutionMemberships.error && (institutionMemberships.count ?? 0) > 0;
  if (!isTeacher && !isAdmin && !isInstitutionStaff) return null;

  return {
    supabase,
    user,
    isAdmin,
    isTeacher,
    isInstitutionStaff,
    canReviewContent: isAdmin || isTeacher,
  };
});

/**
 * Global content reviewer access. Institution-scoped teachers do not inherit
 * global question-bank or tutorial-review permissions from a school invite.
 */
export const getReviewer = cache(async (): Promise<ReviewerContext | null> => {
  const workspace = await getTeacherWorkspace();
  if (!workspace || (!workspace.isAdmin && !workspace.isTeacher)) return null;
  return {
    supabase: workspace.supabase,
    user: workspace.user,
    isAdmin: workspace.isAdmin,
    isTeacher: workspace.isTeacher,
  };
});
