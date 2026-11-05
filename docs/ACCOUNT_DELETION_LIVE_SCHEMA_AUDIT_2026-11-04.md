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
| challenges | challenger_id (uuid), challenger_name (text) | challenger_id references auth.users with ON DELETE SET NULL; delete challenges created by the account and remove/anonymize challenger_name and inspect result_id for embedded personal references |
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
| generated_course_drafts | user_id, approved_by (uuid) | User-generated course content; approved_by has no FK and must be cleared on other users' drafts when this user was the approver |
| generated_lessons | user_id (uuid) | FK to auth.users and subjects; inspect cascade behavior |
| generated_course_approvals | approved_by (uuid) | Approver attribution; no FK found in live FK scan; clear when this user approved another user's draft, while draft-owned approval rows cascade with the draft |
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
| platform_channel_message_receipts | user_id (uuid), external_user_id, external_message_id, phone_number_id (text) | Message metadata and external WhatsApp identifiers; delete linked receipts and ensure identifiers are not retained in orphaned payloads |
| platform_group_members | user_id (uuid) | Membership in shared groups |
| platform_institution_members | user_id (uuid) | Institution membership |
| platform_user_relationships | subject_user_id, related_user_id, created_by, approved_by (uuid) | Relationship endpoints cascade; creator/approver are attribution references |
| primary_activity_progress | user_id (uuid) | Primary activity progress |
| profiles | id (uuid), username, display_name (text), curriculum_profile (jsonb) | Primary learner profile; id references auth.users with ON DELETE CASCADE; JSON may contain learner data |
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

This is a column-name inventory, not proof that every listed table currently contains rows for every user. It also does not discover identifiers hidden inside JSON documents, text payloads, or object paths. A separate identity-column scan found `challenges.challenger_id`/`challenger_name`, `profiles.display_name`, course-approval attribution fields, and provider/device identifiers; these are documented below.

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

A complete read-only inventory of non-internal triggers across `auth`, `public`, `realtime`, and `storage` found 37 triggers at audit time. The account-relevant side effects include:

- `learn_lessons` insert/update triggers can create `traction_events`, `cortex_events`, and `learner_curriculum_objective_progress` records. These are insert/update side effects, not DELETE triggers. A deletion worker must still explicitly remove the generated event/progress rows.
- `learn_lessons_publish_to_library` copies lesson title, topic, subject, difficulty, blocks, and search text into the shared `lesson_library` once a lesson has at least four blocks and 30% progress. The shared row has `source_lesson_id` but no visible user owner field. Live FK inspection found no FK from `lesson_library.source_lesson_id` to `learn_lessons.id`, so deleting the source lesson will not cascade to the library row. Deletion must explicitly find and remove or safely de-identify `lesson_library` rows sourced from the deleted learner's lessons.
- `lesson_votes_apply` runs on INSERT, UPDATE, and DELETE and adjusts aggregate helpful vote counts on `lesson_library`. Deleting a learner's votes is expected to update these aggregates through the trigger.
- `profiles` insert/update triggers synchronize the user's subject catalog and enforce onboarding/competitive-column rules. No `profiles` DELETE trigger was found in this targeted scan.
- `subjects` insert/update triggers enforce onboarding subject rules. No DELETE-side behavior was found in this targeted scan.
- `user_profiles` has a generic updated-at trigger only.

This was a targeted scan of trigger definitions/functions mentioning profile or user identifiers, not proof that no other trigger can affect deletion. Before worker implementation, run a complete trigger inventory (including all schemas and function bodies), inspect FK cascades recursively, and check scheduled jobs/webhooks that may recreate account data. Deleting a user-owned lesson does not itself fire the observed completion/update analytics triggers.

## Additional findings

- `exam_logs.user_id` is text, unlike most user references. Inspect the application write path and historical format before deleting.
- `challenges.challenger_id` references `auth.users` with `ON DELETE SET NULL`, but `challenger_name` remains. Delete challenges created by the account and anonymize/delete their display name; `challenge_attempts` on those challenges cascade, while attempts by the account on other users' challenges need separate handling and their `user_name` must not survive as a personal identifier.
- `sync_revisions.device_id`, `ai_usage_logs.session_id`, and `traction_events.anonymous_id`/`session_id`/`client_event_id` are additional device/session identifiers. Delete the account's rows by `user_id`; inspect JSON event properties and legacy anonymous-only records for identifiers that can still be linked to the account.
- `challenge_attempts.user_name` may preserve a username after account deletion. Decide whether to remove, replace with a neutral label, or retain only genuinely anonymous competition results. A display name/username is not anonymous merely because the UUID is removed.
- `platform_user_relationships` can represent another user's relationship to the account. Remove relationship rows where the target appears as `subject_user_id` or `related_user_id`; clear `created_by`/`approved_by` attribution where the target merely acted on another user's relationship. Never delete the other person's account.
- `platform_group_members` and `platform_institution_members` must be removed, but shared group/institution records should remain if other members still use them.
- `user_roles` is security-sensitive and must be removed for the deleted identity.
- `published_learning_assets.reviewed_by` is an Auth FK with `ON DELETE SET NULL`; preserve the shared asset and allow attribution to be cleared.
- The live Auth FK inspection found `feedback.user_id` and `exam_results.user_id` use `NO ACTION`, so these records must be explicitly deleted before Auth deletion. `profiles.id` itself cascades from `auth.users`.
- Other Auth FKs use `SET NULL` for audit/attribution records such as `ai_usage_logs`, `ai_anomalies`, `traction_events`, `survey_responses`, `export_logs`, `community_uploads.moderator_id`, `platform_user_relationships.created_by`, and `challenge_attempts.user_id`. Review whether their remaining payloads or display names still identify the deleted learner.
- `user_roles.assigned_by` and `exam_question_topic_proposals.reviewer_id` use `NO ACTION`; clear those attribution references before Auth deletion. Preserve the underlying role assignment/proposal only when it is not owned by the deleted account.
- A wider identity-column scan also found `generated_course_drafts.approved_by` and `generated_course_approvals.approved_by` without an Auth FK. Delete approval rows when their draft is owned by the account; clear approver attribution on another user's draft/approval rather than deleting that other user's content.
- `platform_channel_message_receipts` contains `external_user_id`, `external_message_id`, and `phone_number_id` in addition to `user_id`. Delete account-linked receipts and inspect any provider payload columns for residual identifiers. `profiles.display_name` is personally identifying alongside `username`.
- A path/content-column scan found `community_uploads.file_path`, `project_evidence.content`, shared `past_papers.file_path`, and JSON/text payload fields in AI usage logs, generated lessons, insights, learner events, paper-learning sessions, platform identities/relationships, and published assets. Account-owned rows should be deleted in full; shared curriculum/paper assets must remain. Inspect object references in project evidence and community uploads before deleting any Storage object. Do not delete shared `past_papers` objects because they are global curriculum material.
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


## Complete direct Auth/Profile foreign-key inventory

A follow-up catalog query against `pg_constraint` (rather than relying only on `information_schema`) enumerated every direct FK from `public` into `auth.users` or `public.profiles`. This is the authoritative direct-reference list from the audit snapshot:

| Table.column | Referenced identity | ON DELETE |
|---|---|---|
| academic_contexts.user_id | auth.users.id | CASCADE |
| ai_anomalies.resolved_by | auth.users.id | SET NULL |
| ai_anomalies.user_id | auth.users.id | SET NULL |
| ai_usage_logs.user_id | auth.users.id | SET NULL |
| challenge_attempts.user_id | auth.users.id | SET NULL |
| challenges.challenger_id | auth.users.id | SET NULL |
| community_uploads.moderator_id | auth.users.id | SET NULL |
| community_uploads.contributor_id | auth.users.id | CASCADE |
| cortex_events.user_id | auth.users.id | CASCADE |
| cortex_generation_jobs.user_id | auth.users.id | CASCADE |
| cortex_memory.user_id | auth.users.id | CASCADE |
| exam_question_topic_proposals.reviewer_id | auth.users.id | NO ACTION |
| exam_result_questions.user_id | auth.users.id | CASCADE |
| exam_results.user_id | auth.users.id | NO ACTION |
| experiment_assignments.user_id | auth.users.id | CASCADE |
| export_logs.user_id | auth.users.id | SET NULL |
| feedback.user_id | auth.users.id | NO ACTION |
| focus_sessions.user_id | auth.users.id | CASCADE |
| generated_lessons.user_id | auth.users.id | CASCADE |
| insights.user_id | auth.users.id | CASCADE |
| learn_lessons.user_id | auth.users.id | CASCADE |
| learner_brain_events.user_id | auth.users.id | CASCADE |
| learner_curriculum_objective_progress.user_id | auth.users.id | CASCADE |
| learning_paths.user_id | auth.users.id | CASCADE |
| learning_signals.user_id | auth.users.id | CASCADE |
| lesson_votes.user_id | auth.users.id | CASCADE |
| paper_learning_attempts.user_id | auth.users.id | CASCADE |
| paper_learning_sessions.user_id | auth.users.id | CASCADE |
| paper_learning_transfer_questions.user_id | auth.users.id | CASCADE |
| platform_group_members.user_id | auth.users.id | CASCADE |
| platform_institution_members.user_id | auth.users.id | CASCADE |
| platform_user_relationships.approved_by | auth.users.id | SET NULL |
| platform_user_relationships.created_by | auth.users.id | SET NULL |
| platform_user_relationships.related_user_id | auth.users.id | CASCADE |
| platform_user_relationships.subject_user_id | auth.users.id | CASCADE |
| primary_activity_progress.user_id | auth.users.id | CASCADE |
| profiles.id | auth.users.id | CASCADE |
| project_evidence.user_id | auth.users.id | CASCADE |
| project_milestones.user_id | auth.users.id | CASCADE |
| projects.user_id | auth.users.id | CASCADE |
| published_learning_assets.reviewed_by | auth.users.id | SET NULL |
| revision_queue.user_id | auth.users.id | CASCADE |
| study_plans.user_id | auth.users.id | CASCADE |
| survey_responses.user_id | auth.users.id | SET NULL |
| sync_revisions.user_id | auth.users.id | CASCADE |
| traction_events.user_id | auth.users.id | SET NULL |
| user_achievements.user_id | auth.users.id | CASCADE |
| user_past_paper_state.user_id | auth.users.id | CASCADE |
| user_profiles.user_id | auth.users.id | CASCADE |
| user_question_attempts.user_id | auth.users.id | CASCADE |
| user_roles.assigned_by | auth.users.id | NO ACTION |
| user_roles.user_id | auth.users.id | CASCADE |
| user_saved_questions.user_id | auth.users.id | CASCADE |
| achievements.user_id | public.profiles.id | CASCADE |
| cortex_insights.user_id | public.profiles.id | CASCADE |
| exams.user_id | public.profiles.id | CASCADE |
| study_topics.user_id | public.profiles.id | CASCADE |
| subjects.user_id | public.profiles.id | CASCADE |
| tasks.user_id | public.profiles.id | CASCADE |
| timetable.user_id | public.profiles.id | CASCADE |

The database engine will automatically cascade or null only the relationships marked above. It will **not** remove user-owned rows that have no FK, and it will block Auth deletion on four NO ACTION relationships: `exam_question_topic_proposals.reviewer_id`, `exam_results.user_id`, `feedback.user_id`, and `user_roles.assigned_by`. The worker must explicitly delete the user's feedback and exam results, and clear reviewer/assigner attribution on records owned by other people before deleting Auth. Also inspect `exam_result_questions.user_id`: it has its own CASCADE FK to Auth as well as a result_id FK to exam_results.


## Local-device data inventory (source inspection)

This section records local stores found in the Android and web source. These stores are not erased by deleting a Supabase Auth user.

| Store | Location / contents | Deletion handling required |
|---|---|---|
| Android DataStore | `shadecode_native`: access/refresh tokens, user ID/email, cached profile, account-keyed tasks/timetable, pending native sync operations | Clear the DataStore after successful server-side deletion is confirmed; `NativeStore.clearSession()` currently clears all preferences. Do not clear merely because a request was queued. |
| Android Room | `shadecode_student.db`: cached subjects, lessons, lesson progress, and `pending_sync` queue. The current Room schema does not attach an account ID to rows and the app is single-session. | Clear account-associated subject/lesson/progress records and pending sync rows after confirmed deletion. Because lessons may be generated per account, preserve none unless their shared/public provenance is verified. |
| Android Snap & Extract | Private files under `filesDir/snap_extract_artifacts`; saved OCR text, edited text, title, timestamps, and optional source URI metadata | Treat as potentially personal user-generated content. Clear local files on this device after confirmed deletion if the account deletion UI promises device-local cleanup; source images are not copied by this store. |
| Web IndexedDB | Database `shadecode-student`, stores `records` and `mutations`; generic local records and queued mutations | Clear both stores on the next authenticated client confirmation that deletion completed. Do not clear while the request is merely pending. |
| Web service worker | `next.config.ts` states PWA service worker is intentionally disabled pending lifecycle rebuild; no active app service-worker cache is expected from this configuration. | Recheck deployed service-worker registrations before release; if one exists from an older app version, define a safe cache cleanup that does not remove shared downloadable curriculum/papers indiscriminately. |
| Browser auth/session | Supabase browser client persists the session according to its configured storage adapter. | Sign out and clear the account's auth storage after deletion completion; avoid broad origin-wide localStorage wipes that may remove unrelated app preferences. |

### Offline sync race

`NativeSyncWorker` reads account-scoped pending operations from DataStore and lesson-progress operations from Room, refreshes expired sessions, and retries failures. A deletion implementation must prevent new sync writes once a deletion job is processing and must stop/revoke the worker's credentials after the account is deleted. Pending local mutations must not be replayed after a deletion request has been accepted or after the account is deleted. The app currently has no server deletion-completion signal wired into this worker, so this remains a release blocker.

### Local cleanup boundary

A server-side deletion cannot reach devices that remain offline. The next successful app connection must receive an unambiguous deletion-completed/account-removed signal before local cleanup is triggered. If the user never reconnects, local copies can remain on that device until app data is cleared or the app is uninstalled. This limitation must be disclosed clearly; do not claim remote offline cache erasure.


### Identity and attribution columns without an account-owner FK

The final identity-column scan found additional fields that need explicit cleanup or correlation review:

- `curriculum_verification_events.reviewer_id` has no direct Auth FK in the live catalog. Clear or anonymize reviewer attribution where the account reviewed shared curriculum; preserve the verification event only if the retained record is genuinely non-identifying and its integrity requirements are documented.
- `generated_course_drafts.approved_by` and `generated_course_approvals.approved_by` have no direct Auth FK. Delete approval records belonging to the deleted account's own draft; clear approval attribution on another user's draft.
- `experiment_assignments.anonymous_id`, `survey_responses.anonymous_id`, and `traction_events.anonymous_id` may remain linkable to the account even when `user_id` is null. Inspect application identity assignment and event correlation logic; do not retain anonymous IDs that can still be linked to the deleted learner.
- `ai_usage_logs.session_id`, `paper_learning_attempts.session_id`, and `paper_learning_transfer_questions.session_id` are additional session references. Remove account-owned rows and verify child rows follow their parent-session cascade.
- `sync_revisions.device_id`, `traction_events.session_id`, and platform-channel external identifiers should be treated as potentially identifying metadata, not harmless technical strings.

### RLS review

A live `pg_policies` inspection found many account tables with owner-scoped policies using `auth.uid() = user_id`, but the policy set is not uniform. Some operational/platform tables deny direct authenticated access and are service-role-only; some tables expose only SELECT/INSERT policies; several account tables do not expose a user DELETE policy. Public-read tables such as `challenges` also retain display fields that are not erased by deleting the Auth identity. RLS is an access-control layer, not a deletion mechanism. The worker must use a server-only privileged role, execute an explicit reviewed cleanup plan, and verify postconditions. It must never expose the service key to web or Android clients.


### Additional web Project Studio stores

Source inspection of Project Studio found further learner-owned local data beyond the generic IndexedDB cache:

- `shadecode-student-local` / `projects`: local project records.
- `shadecode-student-projects` / `project-records`: local project records.
- `shadecode-project-recovery` / `snapshots`: full project snapshots, including project briefs, requirements, evidence, and generated work plans.
- `shadecode-offline-mutations` / `mutations`: account-owned queued project and project-evidence mutations, indexed by `ownerId`.
- `localStorage["shadecode-project-studio-v1"]`: legacy project collection.

Project evidence currently syncs as text content into `project_evidence.content`; the inspected Project Studio code does not upload evidence images/files to Storage. It also queues offline project/evidence writes with the current authenticated owner ID. Confirm the full queue implementation and any other local project artifacts before release. These stores must be cleared for the deleted owner only after completion is confirmed; shared offline curriculum content must not be erased as collateral.


## Second-pass user ownership scan: tables with no Auth FK

A second live catalog pass enumerated every likely ownership/identity column and tested whether the exact column has a foreign key. These account-linked columns have **no direct FK**, so Auth deletion will not remove their rows automatically:

| Table.column | Type | Required handling |
|---|---|---|
| `daily_focus.user_id` | uuid | Delete rows for the account. Contains focus subject/topic, reason and suggested task JSON. |
| `exam_logs.user_id` | text | Determine whether stored as UUID text or another legacy identifier; delete matching rows only after verifying the write path. `prompt` and `exam_text` can contain personal work. |
| `generated_course_drafts.user_id` | uuid | Delete all drafts owned by the account; JSON draft/result and error fields may contain personal content. |
| `insights_archive.user_id` | uuid | Delete archived insights and metadata for the account. |
| `learning_events.user_id` | uuid | Delete learning events and metadata for the account. |
| `platform_channel_identities.user_id` | uuid | Delete identity link and external channel ID/metadata for the account. |
| `platform_channel_link_codes.user_id` | uuid | Delete outstanding/used link codes for the account. |
| `platform_channel_message_receipts.user_id` | uuid, nullable | Delete linked receipts; additionally correlate external_user_id/phone_number_id for account messages where user_id is null. |
| `revisions.user_id` | uuid | Delete revision content, flashcards and questions. |
| `topic_mastery.user_id` | uuid | Delete learner mastery profile and metrics. |
| `user_careers.user_id` | uuid | Delete learner career selections. |
| `user_cortex.user_id` | uuid | Delete Cortex learner profile and aggregate learning metrics. |
| `curriculum_verification_events.reviewer_id` | uuid, nullable | Clear/anonymize reviewer attribution; inspect notes/evidence JSON for identity before retaining shared curriculum verification. |

The scan also confirms that `exam_question_topic_proposals.reviewer_id`, `exam_results.user_id`, `feedback.user_id`, and `user_roles.assigned_by` do have NO ACTION Auth foreign keys, and must be handled before Auth deletion. `generated_course_drafts.approved_by` has no FK and needs attribution cleanup on other users' drafts.

### Important correction to the previous inventory

The earlier identity scan was incomplete: `daily_focus`, `exam_logs`, `generated_course_drafts`, `insights_archive`, `learning_events`, `platform_channel_identities`, `platform_channel_link_codes`, `platform_channel_message_receipts`, `revisions`, `topic_mastery`, `user_careers`, and `user_cortex` were omitted from its table-level summary. They are now explicitly included. A production deletion worker must use a reviewed explicit table list, not assume FK cascade is comprehensive.

### Operational channel data

WhatsApp/channel records require coordinated deletion: remove link codes and identity mappings; remove linked message receipts; clear external IDs from any unlinked receipts only where the account-to-channel mapping can be proven. Do not delete a shared phone-number configuration or channel-wide integration secret. Processor-side message retention/deletion must be separately requested from Meta where applicable and disclosed according to its actual retention capabilities.


## Read-only worker preparation RPC

Migration `20261105100000_account_deletion_preview_rpc.sql` adds `public.preview_account_deletion(uuid)` as a service-role-only, read-only inventory function. It returns table/identity-column counts and a handling label for the explicitly enumerated direct-FK and non-FK account references, shared lesson-library copies (joined through the user's source lessons), and the two user-prefix Storage buckets. It does not return row content, identifiers belonging to other users, or mutate any records.

This is a preparatory control, not a deletion worker. The migration has been committed to the feature branch only and has **not** been applied to production. Before applying it, validate the function against a disposable Supabase database with representative fixtures for:
- an account with rows in every enumerated ownership table;
- another account's records where the target user is only a reviewer/moderator/approver/assigner;
- a shared lesson-library copy sourced from the target account;
- pending community uploads and backup objects under the target prefix;
- shared `past-papers` objects that must remain untouched.

The preview counts are not sufficient authorization to delete: storage object ownership must be verified by exact metadata/path and application provenance, and the worker must separately resolve unlinked WhatsApp receipts, anonymous identifiers, processor retention, and all nested JSON identity fields.


## Missing Auth FK remediation

A live orphan check for the 14 non-FK UUID identity/attribution columns returned **zero orphan rows** in every column. The legacy `exam_logs` table currently has zero rows; its `user_id` remains text and is not converted without an application-level compatibility review.

Migration `20261105110000_add_missing_account_identity_foreign_keys.sql` now proposes validated Auth FKs for:
- Cascade-owned rows: `daily_focus.user_id`, `generated_course_drafts.user_id`, `insights_archive.user_id`, `learning_events.user_id`, `platform_channel_identities.user_id`, `platform_channel_link_codes.user_id`, `platform_channel_message_receipts.user_id`, `revisions.user_id`, `topic_mastery.user_id`, and `user_careers.user_id`, `user_cortex.user_id`.
- Attribution-only rows: `curriculum_verification_events.reviewer_id` and `generated_course_drafts.approved_by` use `ON DELETE SET NULL`.
- `generated_course_approvals.approved_by` is changed to nullable and receives `ON DELETE SET NULL`, preserving another user's approval record while removing the deleted approver identity.

These migrations are branch-only and have not been applied to production. The orphan scan is a point-in-time check; the migration's constraint validation is the final database guard. Re-run the orphan checks immediately before applying. Review RLS and trigger behaviour separately: adding FKs does not make user-facing DELETE policies necessary because the worker will use its privileged server role.


## Third-pass identity correlation findings

The broader UUID/text identity-column scan reconfirmed the following cleanup details:

- `challenge_attempts.user_name` and `challenges.challenger_name` are retained display-name fields. The worker must delete the target user's own attempts and challenges, not merely rely on Auth `SET NULL`.
- `experiment_assignments.anonymous_id`, `survey_responses.anonymous_id`, and `traction_events.anonymous_id` may be linkable identifiers. Delete account-owned rows before any `SET NULL` FK action can orphan the anonymous ID. Do not retain an anonymous identifier if the app can still map it to the deleted account.
- `sync_revisions.device_id`, `ai_usage_logs.session_id`, `paper_learning_attempts.session_id`, `paper_learning_transfer_questions.session_id`, and `traction_events.session_id` are device/session metadata. Delete user-owned rows; do not attempt a global delete by device/session ID without proving the identifier is not shared by another account/device.
- `platform_channel_message_receipts` may have `user_id IS NULL` but still be linkable by `channel + external_user_id` to a row in `platform_channel_identities`. The read-only preview RPC now counts these unlinked-but-correlated receipts separately. The worker must collect the identity mapping first, delete those receipts, and only then remove the channel identity. Do not delete channel-wide `phone_number_id` configuration.
- `exam_logs` currently contains zero rows. Its `user_id` remains text and is not safe to convert to UUID without checking historical write formats if the table is populated later.

### RLS detail for non-FK ownership tables

The live RLS policy inventory confirms:
- `daily_focus`, `learning_events`, and `user_cortex` expose owner-scoped SELECT policies but no user DELETE policy.
- `generated_course_drafts` permits owner insert/read and admin moderation, but has no owner DELETE policy.
- `revisions`, `topic_mastery`, and `user_careers` have owner-scoped deletion or ALL policies, but the server worker should not depend on client RLS permissions.
- `exam_logs`, `insights_archive`, `curriculum_verification_events`, and platform-channel tables deny public/anon/authenticated API access entirely.

This reinforces that the worker must use a narrowly scoped server-side privileged connection and a reviewed explicit plan. No browser or Android client receives the service-role key.


## Worker queue lease mechanics

Migration `20261105120000_account_deletion_worker_leases.sql` adds an atomic lease to the durable request queue:
- `claim_account_deletion_request()` uses row locking with `SKIP LOCKED` to claim one pending or expired-processing request, assigns a random lease token, increments attempts, and bounds lease duration to 30–900 seconds.
- `release_account_deletion_request()` requires the exact request ID and lease token, sanitizes the error code, and either requeues or marks the request failed.
- Both functions are service-role-only. They do not delete account records, Storage objects, or Auth identities.
- A processing request with a missing lease expiry (created before lease support) can be reclaimed safely. A non-expired lease cannot be stolen.

The future worker must renew or extend leases for long jobs, verify the lease token before every phase transition, make Storage and database phases idempotent, and never mark a request complete until Auth deletion has succeeded. The worker must also distinguish transient failures (requeue) from unsafe/incomplete inventory (fail for manual review). These migrations remain branch-only and have not been applied to production.


### Lease heartbeat, completion gate and crash recovery

Migration `20261105130000_account_deletion_worker_lease_lifecycle.sql` adds:
- `renew_account_deletion_request()`: extends only the caller's matching, unexpired lease, with a bounded 30–900 second duration.
- `complete_account_deletion_request()`: refuses to mark a job complete while its `user_id` is still present. The worker must delete the Auth user last, which causes the queue FK to set `user_id = NULL`, then complete with the same lease token.
- `recover_completed_account_deletion_requests()`: finalizes a processing request whose Auth user was already deleted if the worker crashed between Auth deletion and queue completion.

All are service-role-only. The completion gate enforces the critical order: database and Storage cleanup first, Auth deletion last, queue completion after Auth deletion. These functions still do not delete account data themselves.


### Community upload lifecycle verified from application routes

The submission route writes PDFs to `community-uploads-pending/<auth.uid()>/<timestamp>_...` and stores that exact key in `community_uploads.file_path`. The admin approval route downloads that private object, copies it into the shared `past-papers` bucket under the canonical syllabus path, upserts the global `past_papers` catalog row with `source_url = community_upload:<submission-id>`, marks the submission approved, then removes the pending object.

Deletion rules:
- Delete pending-bucket objects under the exact account UID prefix and delete the account's `community_uploads` rows.
- Do not delete a promoted object from `past-papers`; it is now shared curriculum/exam material, not the user's private upload.
- Removing the `community_uploads` row also removes the direct contributor-to-submission link. The surviving `source_url` contains only the random submission UUID, not the account ID; verify no separate audit/export record maps it back to the deleted contributor.


### Backup bucket path verified

The local-first backup implementation stores one opaque encrypted object at `shadecode-backups/<auth.uid()>/latest.scsync`. It uses browser-side encryption and the Storage policy enforces the first path segment as the authenticated UID. The worker should delete the exact `<uid>/latest.scsync` object (or the exact UID prefix if the format later expands), never the entire bucket. The current live Storage inventory showed only 58 shared `past-papers` objects and zero objects in both `shadecode-backups` and `community-uploads-pending` at audit time.


### Storage deletion manifest

Migration `20261105140000_account_deletion_storage_manifest.sql` adds `account_deletion_storage_manifest(uuid)`, a service-role-only read-only RPC returning exact object keys from:
- `shadecode-backups` under the user's UID prefix;
- `community-uploads-pending` under the user's UID prefix;
- exact `community_uploads.file_path` values for rows contributed by the user (covers any legacy path not following the current prefix convention).

The manifest deliberately cannot return `past-papers` objects. The worker must remove returned objects using the Supabase Storage API, treat already-missing objects as success, and only then proceed to database row deletion. It must not delete by wildcard outside the two private buckets.
