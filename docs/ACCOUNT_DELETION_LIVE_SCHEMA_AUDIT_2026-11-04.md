# Live account-deletion schema audit

**Audit date:** 4 November 2026  
**Project:** `shadecode-student` (Supabase ref `zczdtffwzkctkxwmvalb`)  
**Method:** read-only live database introspection through Supabase Management tooling. No user rows were read or modified.  
**Status:** schema inventory only; not a deletion implementation or legal certification.

## Executive finding

The live database has substantially more account-linked data than the initial source-only inventory showed. A safe deletion workflow cannot rely on deleting `auth.users` or `profiles` and assuming every record cascades. Many user-owned tables have a `user_id` column but no foreign key to `auth.users` or `profiles`. Some use text identifiers. The database has three private Storage buckets. A follow-up metadata-only inspection found 58 objects in `past-papers` and no objects in `community-uploads-pending` or `shadecode-backups` at audit time.

**Do not ship an account deletion endpoint until this inventory is reconciled with the repository migrations, Storage object ownership, and local-device caches.**

## Live account-linked columns

The following tables/columns were found in `public` by scanning for `user_id`, `owner_id`, `profile_id`, `created_by`, `reviewed_by`, `author_id`, `student_id`, `account_id`, and names containing `user`.

| Table | Account-linked column(s) | Notes |
|---|---|---|
| academic_contexts | user_id (uuid) | Learner context |
| achievements | user_id (uuid) | FK to profiles.id, ON DELETE CASCADE |
| ai_anomalies | user_id (uuid), resolved_by (uuid) | AI operations/diagnostics and resolver attribution |
| ai_usage_aggregates | unique_users (integer) | Aggregate, not a user key |
| ai_usage_logs | user_id (uuid) | AI usage records |
| challenge_attempts | user_id (uuid), user_name (text) | user_id uses ON DELETE SET NULL; remove or anonymize display name and any identifying payload |
| cortex_events | user_id (uuid) | Cortex event history |
| cortex_generation_jobs | user_id (uuid) | Generation job state |
| cortex_insights | user_id (uuid) | FK to profiles.id, ON DELETE CASCADE |
| cortex_memory | user_id (uuid) | Learner memory |
| daily_focus | user_id (uuid) | Focus records |
| exam_logs | user_id (text) | Legacy text identifier; do not assume UUID cast |
| exam_result_questions | user_id (uuid) | Result detail |
| exam_results | user_id (uuid) | Result history |
| exams | user_id (uuid) | FK to profiles.id, ON DELETE CASCADE |
| experiment_assignments | user_id (uuid) | Experiment assignment |
| export_logs | user_id (uuid) | Export audit |
| feedback | user_id (uuid) | Support/feedback content |
| focus_sessions | user_id (uuid) | Focus history |
| generated_course_drafts | user_id (uuid) | User-generated course content |
| generated_lessons | user_id (uuid) | FK to auth.users and subjects; inspect cascade behavior |
| insights | user_id (uuid) | Legacy insights |
| insights_archive | user_id (uuid) | Archived insights |
| learn_lessons | user_id (uuid) | User-created/assigned lesson rows |
| learner_brain_events | user_id (uuid) | Learner memory events |
| learner_curriculum_objective_progress | user_id (uuid) | Objective progress |
| learning_events | user_id (uuid) | Learning event history |
| learning_paths | user_id (uuid) | Learning path |
| learning_signals | user_id (uuid) | Learner signals |
| lesson_votes | user_id (uuid) | User votes |
| paper_learning_attempts | user_id (uuid) | Paper learning attempts |
| paper_learning_sessions | user_id (uuid) | Paper learning sessions |
| paper_learning_transfer_questions | user_id (uuid) | Transfer questions |
| platform_channel_identities | user_id (uuid), external_user_id (text) | WhatsApp/platform identity; delete both linkage and identifiers |
| platform_channel_link_codes | user_id (uuid) | Temporary link codes |
| platform_channel_message_receipts | user_id (uuid), external_user_id (text) | Message metadata and external identity |
| platform_group_members | user_id (uuid) | Membership in shared groups |
| platform_institution_members | user_id (uuid) | Institution membership |
| platform_user_relationships | subject_user_id, related_user_id, created_by, approved_by (uuid) | Relationship endpoints cascade; creator/approver are attribution references |
| primary_activity_progress | user_id (uuid) | Primary activity progress |
| profiles | id (uuid), username (text), curriculum_profile (jsonb) | Primary learner profile; id references auth.users with ON DELETE CASCADE; JSON may contain learner data |
| project_evidence | user_id (uuid) | Evidence content may include uploaded files |
| community_uploads | contributor_id, moderator_id (uuid), file_path (text) | Contributor-owned pending upload; clean referenced Storage object |
| curriculum_verification_events | reviewer_id (uuid) | Reviewer identity in verification history; inspect retention/anonymization policy |
| exam_question_topic_proposals | reviewer_id (uuid) | Auth FK uses NO ACTION; clear reviewer attribution before Auth deletion |
| user_roles | user_id, assigned_by (uuid) | Account role rows cascade; assigned_by uses NO ACTION and must be cleared when this account assigned another user's role |
| project_milestones | user_id (uuid) | Milestone data |
| projects | user_id (uuid) | Project ownership |
| published_learning_assets | reviewed_by (uuid) | Auth FK uses ON DELETE SET NULL; preserve shared assets and clear reviewer attribution |
| revision_queue | user_id (uuid) | Revision queue |
| revisions | user_id (uuid) | Revision history |
| study_plans | user_id (uuid) | Study plans |
| study_topics | user_id (uuid) | FK to profiles.id, ON DELETE CASCADE |
| subjects | user_id (uuid) | FK to profiles.id, ON DELETE CASCADE |
| survey_responses | user_id (uuid) | Survey answers |
| sync_revisions | user_id (uuid) | Sync protocol state |
| tasks | user_id (uuid) | FK to profiles.id, ON DELETE CASCADE |
| timetable | user_id (uuid) | FK to profiles.id, ON DELETE CASCADE |
| topic_mastery | user_id (uuid) | Mastery state |
| traction_events | user_id (uuid) | Product analytics/event history |
| user_achievements | user_id (uuid) | User achievement state |
| user_careers | user_id (uuid) | Career interests |
| user_cortex | user_id (uuid) | Legacy/summary Cortex profile |
| user_past_paper_state | user_id (uuid) | Paper state |
| user_profiles | user_id (uuid) | Secondary profile table |
| user_question_attempts | user_id (uuid) | Question attempt history |
| user_roles | user_id (uuid) | Authorization data; must remove account's role assignments |
| user_saved_questions | user_id (uuid) | Saved question state |

This is a column-name inventory, not proof that every listed table currently contains rows for every user. It also does not discover identifiers hidden inside JSON documents, text payloads, or object paths.

## Foreign-key behavior observed

The live FK metadata confirms many account relationships, but it also exposes several important blockers and attribution references. Confirmed profile cascades include `achievements`, `cortex_insights`, `exams`, `study_topics`, `subjects`, `tasks`, and `timetable`. There are other non-account FKs that cascade child records, including paper-learning attempts/transfer questions under sessions, result questions under exam results, project evidence/milestones under projects, and lesson prerequisites under lessons.

Many account-linked tables in the inventory above do **not** show a direct FK to `auth.users` or `profiles`. The deletion workflow must explicitly delete those rows by the correct typed owner key, in dependency order, and verify zero remaining matches before deleting the Auth identity. Never use broad text matching or cast text identifiers blindly.

## Storage buckets

Live Storage introspection found these private buckets:

- `past-papers`
- `community-uploads-pending`
- `shadecode-backups`

The bucket inventory and Storage policy metadata were inspected without reading object names or file contents. At audit time, `past-papers` contained 58 objects with no per-user Storage owner metadata; `community-uploads-pending` and `shadecode-backups` contained zero objects. The backup bucket policies enforce `<auth.uid()>/...` as the first path segment for reads, writes, updates and deletes. The pending community bucket permits authenticated inserts and scopes reads to the first path segment matching the user ID (or an admin). `community_uploads.file_path` links database submissions to uploaded objects. Before deletion can be considered complete:
1. Inspect Storage policies and object path conventions for all three buckets.
2. Determine whether `project_evidence`, community uploads, or generated user content stores object paths.
3. Delete user-owned objects before deleting the Auth user, because Supabase Auth deletion can fail while the user still owns Storage objects.
4. Do not delete shared curriculum, public learning assets, or global exam papers merely because a user's row references them.
5. Establish whether backups contain user data and define provider backup expiry / selective erasure behavior.

## Trigger and database-side side-effect audit

A complete read-only inventory of non-internal triggers across `auth`, `public`, `realtime`, and `storage` found 38 triggers at audit time. The account-relevant side effects include:

- `learn_lessons` insert/update triggers can create `traction_events`, `cortex_events`, and `learner_curriculum_objective_progress` records. These are insert/update side effects, not DELETE triggers. A deletion worker must still explicitly remove the generated event/progress rows.
- `learn_lessons_publish_to_library` copies lesson title, topic, subject, difficulty, blocks, and search text into the shared `lesson_library` once a lesson has at least four blocks and 30% progress. The shared row has `source_lesson_id` but no visible user owner field. Deletion must inspect and remove or safely de-identify `lesson_library` rows sourced from the deleted learner's lessons; do not assume deleting the source lesson cascades to this library table.
- `lesson_votes_apply` runs on INSERT, UPDATE, and DELETE and adjusts aggregate helpful vote counts on `lesson_library`. Deleting a learner's votes is expected to update these aggregates through the trigger.
- `profiles` insert/update triggers synchronize the user's subject catalog and enforce onboarding/competitive-column rules. No `profiles` DELETE trigger was found in this targeted scan.
- `subjects` insert/update triggers enforce onboarding subject rules. No DELETE-side behavior was found in this targeted scan.
- `user_profiles` has a generic updated-at trigger only.

This was a targeted scan of trigger definitions/functions mentioning profile or user identifiers, not proof that no other trigger can affect deletion. Before worker implementation, run a complete trigger inventory (including all schemas and function bodies), inspect FK cascades recursively, and check scheduled jobs/webhooks that may recreate account data. Deleting a user-owned lesson does not itself fire the observed completion/update analytics triggers.

## Additional findings

- `exam_logs.user_id` is text, unlike most user references. Inspect the application write path and historical format before deleting.
- `challenge_attempts.user_name` may preserve a username after account deletion. Decide whether to remove, replace with a neutral label, or retain only genuinely anonymous competition results. A display name/username is not anonymous merely because the UUID is removed.
- `platform_user_relationships` can represent another user's relationship to the account. Remove relationships where the target account appears in any of its three columns, without deleting the other person's account.
- `platform_group_members` and `platform_institution_members` must be removed, but shared group/institution records should remain if other members still use them.
- `user_roles` is security-sensitive and must be removed for the deleted identity.
- `published_learning_assets.reviewed_by` is an Auth FK with `ON DELETE SET NULL`; preserve the shared asset and allow attribution to be cleared.
- The live Auth FK inspection found `feedback.user_id` and `exam_results.user_id` use `NO ACTION`, so these records must be explicitly deleted before Auth deletion. `profiles.id` itself cascades from `auth.users`.
- Other Auth FKs use `SET NULL` for audit/attribution records such as `ai_usage_logs`, `ai_anomalies`, `traction_events`, `survey_responses`, `export_logs`, `community_uploads.moderator_id`, `platform_user_relationships.created_by`, and `challenge_attempts.user_id`. Review whether their remaining payloads or display names still identify the deleted learner.
- `user_roles.assigned_by` and `exam_question_topic_proposals.reviewer_id` use `NO ACTION`; clear those attribution references before Auth deletion. Preserve the underlying role assignment/proposal only when it is not owned by the deleted account.
- `community_uploads.contributor_id` cascades from Auth and stores `file_path`; clean up the corresponding object before deleting the row.
- The Storage buckets are private, but private does not mean account-scoped or automatically erased.
- The live database has RLS enabled on the tables returned by the table inventory, but RLS policy coverage/semantics must be reviewed separately. RLS does not perform deletion automatically.

## Required deletion design

1. Require an authenticated session for the account being deleted, verify the server-side user with Supabase Auth, require recent re-authentication/explicit confirmation, and rate-limit requests. Never accept a target user ID supplied by the client as authority.
2. Create an idempotent deletion job/tombstone with minimal operational metadata. Do not store passwords, tokens, or unnecessary copies of the request.
3. Block new writes/syncs for the account while deletion is running; revoke sessions where supported and account for still-valid JWT expiry.
4. Delete explicit account-owned rows from every table above, including text-keyed and multi-user relationship tables, then delete dependent rows and account-owned Storage objects in safe dependency order.
5. Handle processor deletion requests where required and document provider retention/backup expiry.
6. Delete the Supabase Auth user only after dependent rows and Storage ownership are cleared. Verify the Auth user and all account-linked rows are gone.
7. Clear local Android DataStore and Room databases, queued sync mutations, web IndexedDB/service-worker caches, and account-scoped downloaded material on the relevant device. A server cannot guarantee remote-device cache erasure, so document the local cleanup behavior and trigger it on the next authenticated client response where possible.
8. Keep a minimal, non-identifying completion record sufficient to demonstrate fulfillment, with a defined retention period.
9. Test cross-account isolation, partial failures, retries, concurrent requests, FK blockers, storage deletion failures, and post-deletion token/session behavior.

## Open questions before implementation

- Which new Storage objects are created after this snapshot, and do they follow the currently observed owner/path conventions?
- Are there account identifiers embedded in JSON payloads, metadata, event properties, logs, exports, or backups?
- Which account-linked tables are intentionally retained in anonymized aggregate form, and how is anonymization validated?
- Does the deployed app use a server-only Supabase service key for Admin Auth deletion, and where is it configured? Never expose it to the browser or Android app.
- Which existing RPCs/triggers or retention jobs mutate user data concurrently with deletion?
- What is the expected local-device cleanup contract for devices that remain offline after server deletion?

## Verification boundary

The audit used read-only metadata queries against the active Shadecode Student Supabase project. No account records were selected, changed, or deleted. The schema may evolve; rerun this inventory immediately before implementing and testing the deletion workflow.
