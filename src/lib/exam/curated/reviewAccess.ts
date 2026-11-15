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
  isIndependentEducator: boolean;
  canAuthorTutorials: boolean;
  canReviewContent: boolean;
}

export interface ReviewerContext {
  supabase: SupabaseClient;
  user: User;
  isAdmin: boolean;
  isTeacher: boolean;
}

export const getTeacherWorkspace = cache(async (): Promise<TeacherWorkspaceContext | null> => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [teacher, admin, institutionMemberships, educator] = await Promise.all([
    supabase.rpc("has_role", { user_id: user.id, role_name: "teacher" }),
    supabase.rpc("has_role", { user_id: user.id, role_name: "admin" }),
    supabase.from("platform_institution_members")
      .select("institution_id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("status", "active")
      .in("membership_role", [...INSTITUTION_TEACHING_ROLES]),
    supabase.from("platform_educator_profiles").select("status").eq("user_id", user.id).maybeSingle(),
  ]);

  const isTeacher = !teacher.error && teacher.data === true;
  const isAdmin = !admin.error && admin.data === true;
  const isInstitutionStaff = !institutionMemberships.error && (institutionMemberships.count ?? 0) > 0;
  const isIndependentEducator = !educator.error && educator.data?.status === "approved";
  if (!isTeacher && !isAdmin && !isInstitutionStaff && !isIndependentEducator) return null;

  return {
    supabase, user, isAdmin, isTeacher, isInstitutionStaff, isIndependentEducator,
    canAuthorTutorials: isAdmin || isTeacher || isIndependentEducator,
    canReviewContent: isAdmin || isTeacher,
  };
});

/** Global content reviewers only. Independent educators and school-scoped teachers do not inherit global review privileges. */
export const getReviewer = cache(async (): Promise<ReviewerContext | null> => {
  const workspace = await getTeacherWorkspace();
  if (!workspace || (!workspace.isAdmin && !workspace.isTeacher)) return null;
  return { supabase: workspace.supabase, user: workspace.user, isAdmin: workspace.isAdmin, isTeacher: workspace.isTeacher };
});

/** Authors may create and edit their own tutorials. This never grants review, publish, class or learner-record access. */
export const getTutorialAuthor = cache(async () => {
  const workspace = await getTeacherWorkspace();
  if (!workspace?.canAuthorTutorials) return null;
  return workspace;
});
