/** Server-side explicit relationship resolver. Never infer relationships from profile data. */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { PlatformRelationships } from "@/lib/platform/context";

export type PlatformUserRelationshipType =
  | "parent"
  | "guardian"
  | "teacher"
  | "tutor"
  | "mentor"
  | "caregiver";

export interface PlatformUserRelationship {
  id: string;
  subjectUserId: string;
  relatedUserId: string;
  relationshipType: PlatformUserRelationshipType;
  status: "active";
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server credentials.");
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export async function resolvePlatformRelationships(
  userId: string,
): Promise<PlatformRelationships> {
  if (!userId) throw new Error("A userId is required.");

  const supabase = getSupabaseAdmin();
  const [institutions, groups, direct] = await Promise.all([
    supabase
      .from("platform_institution_members")
      .select("institution_id")
      .eq("user_id", userId)
      .eq("status", "active"),
    supabase
      .from("platform_group_members")
      .select("group_id, membership_role")
      .eq("user_id", userId)
      .eq("status", "active"),
    supabase
      .from("platform_user_relationships")
      .select("id, subject_user_id, related_user_id, relationship_type, status")
      .or(`subject_user_id.eq.${userId},related_user_id.eq.${userId}`)
      .eq("status", "active"),
  ]);

  if (institutions.error) throw new Error(institutions.error.message);
  if (groups.error) throw new Error(groups.error.message);
  if (direct.error) throw new Error(direct.error.message);

  const groupIds = unique((groups.data ?? []).map((row) => row.group_id as string));
  const institutionIds = unique(
    (institutions.data ?? []).map((row) => row.institution_id as string),
  );
  const canViewGroupStudents = (groups.data ?? []).some((row) =>
    ["teacher", "tutor", "administrator", "staff"].includes(row.membership_role as string),
  );

  let studentIds: string[] = [];
  let groupInstitutionIds: string[] = [];

  if (groupIds.length) {
    const [members, groupRows] = await Promise.all([
      supabase
        .from("platform_group_members")
        .select("user_id, membership_role")
        .in("group_id", groupIds)
        .eq("status", "active"),
      supabase.from("platform_groups").select("institution_id").in("id", groupIds),
    ]);

    if (members.error) throw new Error(members.error.message);
    if (groupRows.error) throw new Error(groupRows.error.message);

    if (canViewGroupStudents) {
      studentIds = (members.data ?? [])
        .filter((row) => row.membership_role === "student" && row.user_id !== userId)
        .map((row) => row.user_id as string);
    }

    groupInstitutionIds = (groupRows.data ?? [])
      .map((row) => row.institution_id as string | null)
      .filter((id): id is string => Boolean(id));
  }

  const directStudentIds = ((direct.data ?? []) as Array<{
    subject_user_id: string;
    related_user_id: string;
  }>)
    .filter((row) => row.related_user_id === userId)
    .map((row) => row.subject_user_id);

  return {
    studentIds: unique([...directStudentIds, ...studentIds]),
    groupIds,
    institutionIds: unique([...institutionIds, ...groupInstitutionIds]),
  };
}

export async function getActivePlatformUserRelationships(
  userId: string,
): Promise<PlatformUserRelationship[]> {
  if (!userId) throw new Error("A userId is required.");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("platform_user_relationships")
    .select("id, subject_user_id, related_user_id, relationship_type, status")
    .or(`subject_user_id.eq.${userId},related_user_id.eq.${userId}`)
    .eq("status", "active");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    subjectUserId: row.subject_user_id as string,
    relatedUserId: row.related_user_id as string,
    relationshipType: row.relationship_type as PlatformUserRelationshipType,
    status: "active",
  }));
}
