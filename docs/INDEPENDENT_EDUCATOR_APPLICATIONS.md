# Independent Educator Applications

Independent tutors, subject specialists, independent teachers and educational creators can apply to contribute to Shadecode without a school invitation or institution membership.

## Flow
- Signed-in user submits a public display name, educator type, teaching introduction, subjects, levels and optional experience.
- Application starts as `pending`; applicants can edit while pending or when changes are requested.
- Only an administrator can approve, request changes, reject or suspend an application.
- Pending and rejected applicants cannot create or publish educator tutorials.
- Approval is an educator-content capability only. It does not grant institution membership, class rosters, student records, school administration, global review privileges or admin access.

## Storage and security
- `platform_educator_profiles` stores the application and review state.
- RLS restricts applicant reads/updates to their own profile and admin review to admins.
- A database trigger protects review-state transitions and reviewer identity.
- `is_approved_independent_educator` is a narrow server-side capability predicate for subsequent authoring integration.
- No production migration was run and no production data was changed.

## Current scope
This slice provides the application/status experience, an administrator review queue at `/admin/educators`, approved educator tutorial authoring, and a student-facing directory at `/learn/educators`. Approved educators can author and submit their own tutorials and upload their own private media. They do not receive review-queue, publish, institution, classwork or learner-record permissions. School-scoped teaching members can also author their own tutorials without receiving global review privileges. The teacher workspace navigation hides school-only classwork/progress for independent educators. The student directory shows only approved public educator profiles and does not expose email addresses or private contact details; direct tutoring requests, scheduling and messaging are future work.
