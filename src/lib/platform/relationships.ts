/**
 * Canonical relationship resolver for the multi-client Shadecode platform.
 *
 * Relationships are explicit. This module must never infer a parent, teacher,
 * class, school, or student relationship from profile fields, names, emails,
 * or curriculum data.
 *
 * The resolver runs server-side with the service-role client. Callers must
 * authenticate the principal before invoking it.
 */

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
  status: "pending" | "active" | "revoked";
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase server credentials.");
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

/**
 * Resolve every explicitly authorized relationship visible to a principal.
 *
 * Important: an empty result is valid. It means there is currently no explicit
 * cross-user relationship, not that the system should guess one.
 */
export async function resolvePlatformRelationships(
  userId: string,
): Promise<PlatformRelationships> {
  if (!userId) {
    throw new Error("A userId is required to resolve platform relationships.");
  }

  const supabase = getSupabaseAdmin();

  const [institutionMemberships, groupMemberships, directRelationships] =
    await Promise.all([
      supabase
        .from("platform_institution_members")
        .select("institution_id")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("platform_group_members")
        .select("group_id")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .from("platform_user_relationships")
        .select(
          "id, subject_user_id, related_user_id, relationship_type, status",
        )
        .or(`subject_user_id.eq.${userId},related_user_id.eq.${userId}`)
        .eq("status", "active"),
    ]);

  if (institutionMemberships.error) {
    throw new Error(
      `Failed to resolve institution memberships: ${institutionMemberships.error.message}`,
    );
  }

  if (groupMemberships.error) {
    throw new Error(
      `Failed to resolve group memberships: ${groupMemberships.error.message}`,
    );
  }

  if (directRelationships.error) {
    throw new Error(
      `Failed to resolve direct relationships: ${directRelationships.error.message}`,
    );
  }

  const groupIds = unique(
    (groupMemberships.data ?? []).map((row) => row.group_id as string),
  );
  const explicitInstitutionIds = unique(
    (institutionMemberships.data ?? []).map(
      (row) => row.institution_id as string,
    ),
  );

  let groupStudentIds: string[] = [];
  let groupInstitutionIds: string[] = [];

  if (groupIds.length > 0) {
    const { data: members, error: memberError } = await supabase
      .from("platform_group_members")
      .select("group_id, user_id, membership_role")
      .in("group_id", groupIds)
      .eq("status", "active");

    if (memberError) {
      throw new Error(
        `Failed to resolve group relationships: ${memberError.message}`,
      );
    }

    groupStudentIds = (members ?? [])
      .filter(
        (row) =>
          row.membership_role === "student" && row.user_id !== userId,
      )
      .map((row) => row.user_id as string);

    const { data: groups, error: groupError } = await supabase
      .from("platform_groups")
      .select("id, institution_id")
      .in("id", groupIds);

    if (groupError) {
      throw new Error(
        `Failed to resolve group institutions: ${groupError.message}`,
      );
    }

    groupInstitutionIds = (groups ?? [])
      .map((row) => row.institution_id as string | null)
      .filter((id): id is string => Boolean(id));
  }

  const relationshipRows = (directRelationships.data ?? []) as Array<{
    id: string;
    subject_user_id: string;
    related_user_id: string;
    relationship_type: PlatformUserRelationshipType;
    status: "active";
  }>;

  // For parent/guardian/caregiver relationships, the subject is the student.
  // For teacher/tutor/mentor relationships, the subject is also the learner.
  // Therefore, when the principal is the related party, the subject is an
  // explicitly linked student. When the principal is the subject, we only add
  // the other user when the relationship itself is learner-directed.
  const directStudentIds = relationshipRows.flatMap((row) => {
    if (row.related_user_id === userId) {
      return [row.subject_user_id];
    }

    if (
      row.subject_user_id === userId &&
      ["teacher", "tutor", "mentor"].includes(row.relationship_type)
    ) {
      return [];
    }

    return [];
  });

  return {
    studentIds: unique([...directStudentIds, ...groupStudentIds]),
    groupIds,
    institutionIds: unique([
      ...explicitInstitutionIds,
      ...groupInstitutionIds,
    ]),
  };
}

/**
 * Resolve the direct relationship records for audit-sensitive decisions.
 * This is intentionally separate from the compact PlatformRelationships
 * projection used by request context.
 */
export async function getActivePlatformUserRelationships(
  userId: string,
): Promise<PlatformUserRelationship[]> {
  if (!userId) {
    throw new Error("A userId is required to resolve relationships.");
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("platform_user_relationships")
    .select("id, subject_user_id, related_user_id, relationship_type, status")
    .or(`subject_user_id.eq.${userId},related_user_id.eq.${userId}`)
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to resolve user relationships: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    subjectUserId: row.subject_user_id as string,
    relatedUserId: row.related_user_id as string,
    relationshipType: row.relationship_type as PlatformUserRelationshipType,
    status: row.status as "active",
  }));
}
