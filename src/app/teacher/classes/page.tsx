import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeacherWorkspace } from "@/lib/exam/curated/reviewAccess";

export const dynamic = "force-dynamic";
export const metadata = { title: "My classes · Shadecode Teacher" };

const TEACHING_ROLES = ["teacher", "tutor", "administrator", "staff"] as const;

type InstitutionMembership = {
  institution_id: string;
  membership_role: string;
  status: string;
};

type GroupMembership = {
  group_id: string;
  membership_role: string;
  status: string;
};

type Institution = {
  id: string;
  name: string;
  institution_type: string;
  country_code: string | null;
};

type TeachingGroup = {
  id: string;
  institution_id: string | null;
  name: string;
  group_type: string;
  metadata: Record<string, unknown>;
};

function titleCase(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function TeacherClassesPage() {
  const reviewer = await getTeacherWorkspace();
  if (!reviewer) redirect("/");

  const { data: institutionRows, error: institutionMembershipError } = await reviewer.supabase
    .from("platform_institution_members")
    .select("institution_id,membership_role,status")
    .eq("user_id", reviewer.user.id)
    .eq("status", "active")
    .in("membership_role", [...TEACHING_ROLES]);

  const { data: groupRows, error: groupMembershipError } = await reviewer.supabase
    .from("platform_group_members")
    .select("group_id,membership_role,status")
    .eq("user_id", reviewer.user.id)
    .eq("status", "active")
    .in("membership_role", [...TEACHING_ROLES]);

  const institutionMemberships = (institutionRows ?? []) as InstitutionMembership[];
  const groupMemberships = (groupRows ?? []) as GroupMembership[];
  const institutionIds = [...new Set(institutionMemberships.map((row) => row.institution_id))];
  const groupIds = [...new Set(groupMemberships.map((row) => row.group_id))];

  const [institutionResult, groupResult] = await Promise.all([
    institutionIds.length
      ? reviewer.supabase.from("platform_institutions").select("id,name,institution_type,country_code").in("id", institutionIds)
      : Promise.resolve({ data: [], error: null }),
    groupIds.length
      ? reviewer.supabase.from("platform_groups").select("id,institution_id,name,group_type,metadata").in("id", groupIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const institutions = (institutionResult.data ?? []) as Institution[];
  const assignedGroups = (groupResult.data ?? []) as TeachingGroup[];
  const groups = assignedGroups;
  const institutionNames = new Map(institutions.map((institution) => [institution.id, institution.name]));
  const membershipRoles = new Map(groupMemberships.map((membership) => [membership.group_id, membership.membership_role]));
  const loadFailed = Boolean(institutionMembershipError || groupMembershipError || institutionResult.error || groupResult.error);

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">Teaching workspace</p>
        <h1 className="text-2xl font-semibold tracking-tight">My classes</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
          Your school memberships, teaching groups and class access in one place.
          Only groups you are actively assigned to appear here.
        </p>
      </header>

      {loadFailed ? (
        <section role="status" className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
          <h2 className="font-semibold">We couldn't load your teaching groups</h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Your access has not been changed. Try again shortly. If this continues, ask your school administrator to check your membership.
          </p>
        </section>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Institutions</h2>
              <span className="text-xs text-[var(--muted-foreground)]">{institutions.length} active</span>
            </div>
            {institutions.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {institutions.map((institution) => (
                  <article key={institution.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-glow)] text-[var(--primary)]" aria-hidden="true">▦</span>
                      <div className="min-w-0">
                        <h3 className="font-semibold">{institution.name}</h3>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {titleCase(institution.institution_type)}
                          {institution.country_code ? ` · ${institution.country_code}` : ""}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--surface)] p-5">
                <h3 className="font-semibold">No school connected yet</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
                  Your teacher account is active, but it is not yet linked to an institution. Ask the school administrator to arrange an institution invitation. We never infer school membership from your email address or profile.
                </p>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Teaching groups</h2>
              <span className="text-xs text-[var(--muted-foreground)]">{groups.length} active</span>
            </div>
            {groups.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {groups.map((group) => (
                  <article key={group.id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{group.name}</h3>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {group.institution_id ? institutionNames.get(group.institution_id) ?? "Institution" : "Independent group"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]">
                        {titleCase(group.group_type)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                      Your role: {titleCase(membershipRoles.get(group.id) ?? "member")}
                    </p>
                    <Link
                      href={`/teacher/classes/${group.id}`}
                      className="mt-4 inline-flex items-center rounded-xl bg-[var(--primary-glow)] px-3 py-2 text-sm font-medium text-[var(--primary)] transition hover:opacity-80"
                    >
                      Open class roster <span className="ml-2" aria-hidden="true">→</span>
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--surface)] p-5">
                <h3 className="font-semibold">No teaching groups assigned</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
                  Once your institution administrator assigns you to a class or teaching group, it will appear here. You will only see learners within groups you are authorized to access.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
