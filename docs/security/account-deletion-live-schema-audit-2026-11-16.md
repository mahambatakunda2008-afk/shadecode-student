# Account deletion: live schema reconciliation (2026-11-16)

**Status:** read-only audit snapshot. This document does not authorize or apply production schema changes, account deletion, Storage deletion, or worker activation.

**Scope:** Supabase project `zczdtffwzkctkxwmvalb`, public-schema identity/attribution columns and foreign-key delete actions, compared with the preview and cleanup SQL in historical PR #553. The audit used catalog metadata and aggregate orphan counts only; no account IDs, emails, profile contents, or object contents were selected.

## Executive result

The old #553 implementation contains valuable safeguards, but its preview list is now stale relative to the live schema. Eleven current identity/attribution-bearing tables are absent from `preview_account_deletion`. Most are protected by `ON DELETE CASCADE`, so the cleanup RPC may remove their rows when Auth is deleted, but the preview currently understates the deletion scope and does not explain the retention semantics.

The live schema also has 14 UUID identity/attribution columns without an Auth FK (plus the separately handled text-keyed `exam_logs.user_id`). Aggregate orphan checks returned **zero** for every UUID column. These are candidates for validated constraints, not permission to apply DDL without staging and migration-history tests.

## Newer live tables missing from the historical preview

| Table | Identity column | Live FK action | Proposed handling |
| --- | --- | --- | --- |
| `canonical_learning_projection_ledger` | `user_id` | CASCADE | Delete account-owned projection ledger rows |
| `content_reviews` | `reviewer_id` | CASCADE | Delete reviews authored by the departing reviewer; verify whether review evidence must be retained in anonymized form |
| `exam_completion_outbox` | `user_id` | CASCADE | Delete account-owned pending/completed outbox events |
| `exam_mastery_projection_ledger` | `user_id` | CASCADE | Delete account-owned mastery projection ledger rows |
| `exam_submission_ledger` | `user_id` | CASCADE | Delete account-owned submission/idempotency records |
| `learner_curriculum_assessment_attempts` | `user_id` | CASCADE | Delete learner-owned assessment attempts |
| `lesson_quiz_attempts` | `user_id` | CASCADE | Delete learner-owned quiz attempts |
| `recommendation_cache_invalidation_events` | `user_id` | CASCADE | Delete account-owned invalidation events |
| `recommendation_cache_versions` | `user_id` | CASCADE | Delete account-owned recommendation cache versions |
| `teacher_invites` | `created_by` | CASCADE | Delete invitations created by the departing account; test pending invitee behaviour |
| `teacher_tutorial_reviews` | `reviewer_id` | CASCADE | Delete reviews authored by the departing reviewer; verify retention requirements |

These rows are currently removed by FK cascade at the final Auth deletion step, not by explicit statements in the historical cleanup RPC. Add all eleven to the preview with accurate handling labels and test their cascade behaviour.

## Live identity columns without an Auth foreign key

The following 14 UUID columns were checked against `auth.users`; aggregate orphan count was zero for each.

| Table.column | Nullability | Proposed FK action | Notes |
| --- | --- | --- | --- |
| `daily_focus.user_id` | NOT NULL | CASCADE | Account-owned state |
| `generated_course_drafts.user_id` | NOT NULL | CASCADE | Account-owned drafts |
| `generated_course_drafts.approved_by` | NULL | SET NULL | Preserve draft, clear approver attribution |
| `insights_archive.user_id` | NULL | CASCADE | Account-owned archive |
| `learning_events.user_id` | NOT NULL | CASCADE | Account-owned learning events |
| `platform_channel_identities.user_id` | NOT NULL | CASCADE | Remove external channel link with account |
| `platform_channel_link_codes.user_id` | NOT NULL | CASCADE | Remove account-owned link codes |
| `platform_channel_message_receipts.user_id` | NULL | CASCADE | Remove account-linked receipts; preserve external channel data belonging to others |
| `revisions.user_id` | NOT NULL | CASCADE | Account-owned revision records |
| `topic_mastery.user_id` | NOT NULL | CASCADE | Account-owned mastery state |
| `user_careers.user_id` | NOT NULL | CASCADE | Account-owned career state |
| `user_cortex.user_id` | NOT NULL | CASCADE | Account-owned Cortex state |
| `curriculum_verification_events.reviewer_id` | NULL | SET NULL | Preserve verification evidence, clear reviewer identity |
| `generated_course_approvals.approved_by` | NOT NULL | SET NULL | Must first become nullable; preserve approval record and notes |

The text-keyed `exam_logs.user_id` is a separate legacy case. The historical cleanup compares it to the UUID rendered as text. Do not add a UUID FK without a deliberate type/data migration.

## Existing NO ACTION Auth foreign keys

These constraints can block Auth deletion unless the cleanup transaction handles them first. The historical #553 cleanup has explicit handling for all four:

| Table.column | Nullable | Historical cleanup action |
| --- | --- | --- |
| `exam_question_topic_proposals.reviewer_id` | YES | Set reviewer attribution to NULL |
| `exam_results.user_id` | YES | Delete the departing account's results |
| `feedback.user_id` | YES | Delete the departing account's feedback |
| `user_roles.assigned_by` | YES | Preserve other users' role rows and clear assigner attribution |

Keep these semantics explicit and covered by two-account integration tests. Do not solve them by broad deletion of rows belonging to other users.

## Existing SET NULL relationships requiring deliberate treatment

Live Auth SET NULL relationships include `ai_anomalies.user_id`, `ai_usage_logs.user_id`, `challenge_attempts.user_id`, `challenges.challenger_id`, `community_uploads.moderator_id`, `export_logs.user_id`, `published_learning_assets.reviewed_by`, `platform_user_relationships.created_by`, `platform_user_relationships.approved_by`, `survey_responses.user_id`, and `traction_events.user_id`.

These are not interchangeable. For each, decide whether the record is account-owned (delete), independently useful with attribution removed (retain + NULL), or aggregated/de-identified (retain only after checking for embedded identifiers). In particular, inspect free-text notes and JSON metadata before treating a row as anonymous.

## Legacy profile cascade

`profiles.id` references `auth.users.id`. The following legacy tables reference `profiles.id` with CASCADE: `achievements`, `cortex_insights`, `exams`, `study_topics`, `subjects`, `tasks`, and `timetable`. Deleting the Auth user therefore removes the profile and these dependent rows. The preview currently lists them, which is useful and should remain.

## Storage constraints

A fresh aggregate count on 2026-11-16 confirmed:
- `past-papers`: private, 58 shared product objects. Never delete the bucket or its shared objects during account deletion.
- `teacher-media`, `community-uploads-pending`, and `shadecode-backups`: private buckets, each currently empty.
- Cleanup must continue to use exact object keys from a verified manifest and an explicit bucket allowlist. A bucket prefix is not sufficient proof of ownership where shared upload records or other users' references exist.

Recheck bucket/object state at staging time; these are time-sensitive counts.

## Required implementation and verification

1. Extend `preview_account_deletion` with the eleven missing tables above, plus any additional identity columns found by scanning current code and migrations.
2. Extend the preview contract so it asserts every identity/attribution FK in the current schema is represented, or explicitly classified as intentionally excluded.
3. Reconcile the cleanup RPC against the same inventory. FK cascades are acceptable only when the preview explains them and integration tests prove the scope.
4. For the 14 no-FK UUID columns, repeat orphan checks in the disposable current-history fixture and add validated FKs with the actions above. Make `generated_course_approvals.approved_by` nullable before adding SET NULL.
5. Preserve explicit handling for the four NO ACTION constraints.
6. Replace the name-pattern-only write-barrier selection with a reviewed inventory, and assert trigger coverage for every account-owned or attribution-bearing table.
7. Build the integration fixture from the current tracked migration history, not the old hand-built baseline alone.
8. Add two-account scenarios for: teacher/institution membership and invitations; student/guardian relationship; reviewer whose review belongs to another account; role assigner; and external channel identity/receipt.
9. Verify local browser and Android stores, provider-side retention, logs, backups, and shared assets separately. Database deletion alone is not a complete account-erasure guarantee.


## Migration-history reconciliation blocker

A fresh inventory on 2026-11-16 found 169 applied entries in the live Supabase migration ledger and **160 SQL files** in the tracked `main` migration directory. A normalized same-name comparison (removing leading numeric/timestamp prefixes) found 116 matching names, 53 remote ledger names without a same-name tracked file, and 44 tracked files without a same-name remote ledger entry. An earlier raw version-prefix comparison yielded different mismatch counts (146 remote versions and 130 tracked prefixes); those raw-prefix counts should not be treated as content-level mapping. The complete remote ledger and unmatched-name lists are recorded in `docs/security/migration-ledger-reconciliation-2026-11-16.md`. The repository includes older numbered migrations and timestamp-prefixed files, while the live history uses timestamp versions and sometimes different recorded names. None of these filename comparisons proves schema drift or proves that a similarly named file is the same migration; renames, squashes, duplicate/reworked migrations, and externally applied changes require SQL-content and Git-history review.

This is nevertheless a hard release gate: do not claim that a disposable database replaying only the current tracked files reproduces production, and do not push account-deletion DDL to production until the team reconciles the remote migration ledger with the repository and documents the authoritative baseline. The account-deletion integration fixture must be based on a verified schema baseline, not merely on the current list of files.

## Safety boundary

- No production DDL or migration was applied during this audit.
- No Auth users, public rows, Storage objects, or external identities were modified.
- The account-deletion worker must remain disabled until the reconciled feature is reviewed and tested in staging, and production activation is explicitly authorized.

## Follow-up catalog verification: complete SET NULL inventory

A second read-only catalog pass enumerated every direct foreign key from `public` to `auth.users`, rather than relying only on the previously highlighted table list. It confirmed **14 SET NULL references**, including three that were not called out in the initial summary: `ai_anomalies.resolved_by`, `teacher_invites.used_by`, and `teacher_tutorials.published_by`. These must be included in the preview/retention contract and tested explicitly:

| Table.column | Live action | Required review |
| --- | --- | --- |
| `ai_anomalies.resolved_by` | SET NULL | Preserve anomaly only if it remains useful without resolver identity; inspect any embedded attribution |
| `ai_anomalies.user_id` | SET NULL | Decide whether account-owned anomaly should instead be deleted; do not assume SET NULL means anonymized |
| `ai_usage_logs.user_id` | SET NULL | Retention/analytics policy and identifier removal must be explicit |
| `challenge_attempts.user_id` | SET NULL | Determine whether attempts are user-owned and should be deleted rather than retained |
| `challenges.challenger_id` | SET NULL | Preserve challenge only if remaining participants and content remain valid |
| `community_uploads.moderator_id` | SET NULL | Preserve upload; remove moderator attribution |
| `export_logs.user_id` | SET NULL | Inspect metadata and object references; clear or delete identifying payloads |
| `platform_user_relationships.approved_by` | SET NULL | Preserve relationship if the two principals remain; clear approver identity |
| `platform_user_relationships.created_by` | SET NULL | Preserve relationship if valid for remaining principals; clear creator identity |
| `published_learning_assets.reviewed_by` | SET NULL | Preserve published asset; clear reviewer identity and inspect review metadata |
| `survey_responses.user_id` | SET NULL | Do not call anonymous until response payload and metadata are scrubbed |
| `teacher_invites.used_by` | SET NULL | Preserve invite only if its remaining state is meaningful; test used invite after invitee deletion |
| `teacher_tutorials.published_by` | SET NULL | Preserve tutorial if authorship/permissions remain valid; clear publisher attribution |
| `traction_events.user_id` | SET NULL | Inspect event properties for embedded identifiers before retaining |

The full direct Auth FK catalog also includes additional CASCADE relationships beyond the eleven tables absent from the historical preview (for example `academic_contexts`, `cortex_events`, `cortex_generation_jobs`, `cortex_memory`, `learner_curriculum_objective_progress`, `platform_group_members`, `platform_institution_members`, and `teacher_tutorials.author_id`). The implementation must compare its explicit inventory against the live catalog as a whole, not treat the eleven-table delta as the complete deletion surface. A fresh staging catalog diff is required immediately before implementation is considered complete.


## Read-only catalog census update (2026-11-16)

A second live catalog census was taken after the migration-ledger inventory. It is an aggregate-only snapshot; no row contents or credentials were exported.

| Surface | Live count / observation |
| --- | ---: |
| Non-system application/platform schemas (excluding `pg_*` and `information_schema`) | 9 |
| Public relations (tables, partitioned tables, views, materialized views) | 118 |
| Public base/partitioned tables with RLS disabled | 0 |
| Public RLS policies | 238 |
| Public triggers | 41 |
| Public indexes | 310 |
| Public functions | 64 |
| Public SECURITY DEFINER functions | 25 |
| Foreign keys referencing auth.users, ON DELETE CASCADE | 58 |
| Foreign keys referencing auth.users, ON DELETE SET NULL | 15 |
| Foreign keys referencing auth.users, NO ACTION | 4 |

The 15 SET NULL relationships include the previously inventoried 14 application relationships plus the Supabase-managed auth.scim_users.user_id relationship. The 4 NO ACTION relationships are feedback.user_id, exam_results.user_id, user_roles.assigned_by, and exam_question_topic_proposals.reviewer_id.

### Storage ownership check

A fresh aggregate query of storage.objects returned 58 objects in past-papers, with **0 objects carrying a non-null owner_id**. This is stronger than a bucket count alone: the current shared past-paper objects are not owned by an Auth user and should remain untouched. No other bucket had objects in this census. Do not remove the shared bucket or its contents during account deletion.

### Account deletion session and storage constraints

Current Supabase Auth documentation states that deleting an Auth user does not immediately invalidate already-issued JWT access tokens; tokens remain valid until expiry. The product flow must therefore revoke/sign out sessions and account for residual access-token lifetime rather than treating Auth-row deletion as instantaneous token invalidation. Supabase also rejects Auth-user deletion while that user owns Storage objects. The live storage ownership census currently shows no such owned objects, but the deletion workflow must still check ownership at execution time and handle future uploads safely.

### Baseline boundary

This census improves the live schema inventory but is **not** a complete schema-only export and does not reconcile all 53 remote-only and 44 tracked-only migration filename entries. It does not authorize account-deletion DDL or worker activation. Continue with catalog-definition export and migration-content/history reconciliation before implementation.


## Exact Auth foreign-key inventory correction (2026-11-16)

The complete direct-FK query includes Supabase-managed Auth relationships as well as application relationships. The aggregate counts are therefore **58 CASCADE, 15 SET NULL, and 4 NO ACTION = 77 direct references to auth.users**. The 15 SET NULL entries consist of 14 public application relationships plus `auth.scim_users.user_id`. The 58 CASCADE entries include 9 Auth-internal relationships; the remaining 49 are public-schema application relationships. The four NO ACTION entries are all in `public` and are listed above.

This distinction matters: do not compare the 77 total directly with the application's deletion preview. The preview contract should cover application-owned public relations and explicitly document the Supabase-managed Auth-internal constraints as platform-managed. The full public-schema inventory, rather than a partial hand-maintained list, is the coverage assertion.

The fresh catalog count also corrects the schema total: there are **9 non-system schemas** when excluding names beginning `pg_` and `information_schema` (`auth`, `extensions`, `graphql`, `graphql_public`, `public`, `realtime`, `storage`, `supabase_migrations`, and `vault`). The earlier broad information_schema count included PostgreSQL internal namespaces and should not be reported as the application/platform schema count.
