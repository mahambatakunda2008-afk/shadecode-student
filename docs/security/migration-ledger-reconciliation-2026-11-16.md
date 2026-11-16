# Supabase migration ledger reconciliation snapshot (2026-11-16)

**Purpose:** record the live migration ledger and tracked migration directory as observed, without pretending filename matching proves migration equivalence. This is a read-only inventory, not a schema baseline or permission to apply DDL.

## Snapshot

- Supabase project: `zczdtffwzkctkxwmvalb`
- Remote ledger: **169** entries, from `20260723183541` to `20261113142908`.
- Tracked `supabase/migrations` directory on `main`: **160 SQL files** (the directory also contains a README).
- Filename-key comparison: **116** remote entries have a same-name tracked file after removing leading numeric/timestamp prefixes; **53** remote entries do not; **44** tracked SQL files do not have a same-name remote ledger entry.
- This comparison is only a triage aid. Renames, squashes, externally applied changes, and duplicate/reworked migrations require content/history review. It does not establish schema drift or replay equivalence.

## Complete remote ledger

| Remote version | Recorded migration name | Same-name tracked file |
| --- | --- | --- |
| `20260723183541` | `create_rbac_system` | Yes |
| `20260723183553` | `create_past_papers_system` | Yes |
| `20260723183601` | `seed_cambridge_syllabi` | Yes |
| `20260723183606` | `exam_hub_admin_write_policies` | Yes |
| `20260723232347` | `seed_zimsec_syllabi` | Yes |
| `20260723235330` | `seed_cambridge_igcse_syllabi` | Yes |
| `20260724071431` | `create_ai_usage_tracking` | Yes |
| `20260724071442` | `create_increment_xp_function_fixed` | No |
| `20260724073604` | `create_cortex_memory_table` | Yes |
| `20260724073619` | `create_user_achievements_table` | Yes |
| `20260724073737` | `create_lesson_prerequisites_table` | Yes |
| `20260724073745` | `create_generated_course_drafts_and_approvals` | No |
| `20260724073758` | `create_careers_skills_and_seed` | No |
| `20260724073839` | `seed_careers_and_skills` | No |
| `20260724115507` | `backfill_legacy_insights` | Yes |
| `20260724120905` | `create_question_indexing` | Yes |
| `20260724192915` | `create_community_uploads` | Yes |
| `20260725112718` | `add_missing_rls_policies` | No |
| `20260726121527` | `combine_as_and_a_level` | Yes |
| `20260726121555` | `migrate_existing_papers_to_combined_level` | No |
| `20260726121658` | `expand_caie_subject_coverage` | Yes |
| `20260727083812` | `normalize_remaining_single_level_caie` | No |
| `20260728084846` | `create_exam_boards_geo_mapping` | Yes |
| `20260804044940` | `enable_rls_insights_archive` | Yes |
| `20260806054330` | `add_tour_completed_to_user_profiles` | Yes |
| `20260806055240` | `add_missing_user_profiles_columns` | Yes |
| `20260806115153` | `enable_rls_cortex_and_content_tables` | No |
| `20260806165359` | `fix_function_search_path_mutable` | No |
| `20260806165434` | `fix_increment_xp_ownership_guard` | No |
| `20260807094658` | `fix_increment_xp_service_role_regression` | No |
| `20260813025958` | `create_study_plans` | No |
| `20260813063357` | `create_local_first_backups` | Yes |
| `20260813085220` | `add_streak_freeze_week_to_cortex_memory` | No |
| `20260813090110` | `add_weekly_goal_minutes_to_profiles` | No |
| `20260816175542` | `add_traction_feedback_experiments_exports` | No |
| `20260816181128` | `add_traction_metrics_and_export_logging` | No |
| `20260816181303` | `harden_survey_response_uniqueness` | No |
| `20260816181420` | `fix_retention_eligibility_windows` | No |
| `20260816190600` | `create_academic_contexts` | Yes |
| `20260817003934` | `harden_academic_context_trigger_search_path` | Yes |
| `20260817060139` | `harden_exam_questions_insert_policy` | Yes |
| `20260817060213` | `create_exam_question_topic_proposals` | Yes |
| `20260817060247` | `add_atomic_question_mapping_review` | Yes |
| `20260817060307` | `harden_question_mapping_review_identity` | Yes |
| `20260817062210` | `internet_paper_source_catalog` | Yes |
| `20260817062340` | `correct_physics_source_catalog_entry` | Yes |
| `20260822193835` | `add_cortex_events_durable_store` | Yes |
| `20260823114047` | `add_exam_question_provenance` | Yes |
| `20260828191753` | `add_canonical_academic_profile` | Yes |
| `20260828192445` | `create_project_studio` | No |
| `20260830103626` | `add_canonical_event_idempotency` | Yes |
| `20260830190807` | `fix_cortex_events_uuid_default` | Yes |
| `20260831172909` | `allow_owned_cortex_event_idempotent_updates` | Yes |
| `20260901125125` | `create_sync_revision_protocol` | Yes |
| `20260901185719` | `extend_topic_mastery_with_local_state` | No |
| `20260901193712` | `20260901193000_make_cortex_event_ingress_pure` | Yes |
| `20260901201012` | `harden_sync_revision_protocol` | Yes |
| `20260901201020` | `fix_sync_revision_client_version_type` | No |
| `20260901211403` | `harden_sync_mutation_record_ownership` | Yes |
| `20260902123212` | `bridge_learn_lesson_completion_to_cortex_events` | Yes |
| `20260904023914` | `add_learn_lesson_topic_identity` | Yes |
| `20260904024008` | `bridge_learn_topic_into_cortex_events` | Yes |
| `20260908041315` | `protect_exam_results_from_public_reads` | No |
| `20260908042402` | `add_traction_event_idempotency` | No |
| `20260908044202` | `instrument_learning_lesson_analytics` | No |
| `20260908132428` | `create_primary_discovery_foundation` | Yes |
| `20260908165956` | `add_profile_learning_language` | Yes |
| `20260909191126` | `add_curriculum_source_identity_and_guards` | Yes |
| `20260909191516` | `20260909203000_add_curriculum_knowledge` | Yes |
| `20260909202608` | `add_curriculum_document_structure` | No |
| `20260909204154` | `add_exact_curriculum_profile` | Yes |
| `20260909210933` | `add_curriculum_profile_answers` | Yes |
| `20260910203854` | `20260910223000_auto_attach_curriculum_to_lessons` | Yes |
| `20260910204410` | `learner_curriculum_objective_progress` | Yes |
| `20260910205731` | `auto_sync_lesson_objective_progress` | Yes |
| `20260911112810` | `create_platform_relationships` | No |
| `20260911175523` | `curriculum_objective_read_access` | Yes |
| `20260911194944` | `add_curriculum_completeness_framework` | No |
| `20260911200046` | `add_curriculum_seed_function_metadata` | No |
| `20260911200155` | `test_curriculum_registry_expansion` | No |
| `20260911210345` | `secure_curriculum_coverage_tables` | No |
| `20260911232227` | `create_platform_channel_identity_registry` | No |
| `20260912182257` | `seed_0478_2026_2028_granular_content_map` | No |
| `20260912182314` | `record_0478_coverage_evidence_progress` | No |
| `20260912184731` | `reconcile_0478_full_assessment_guidance` | No |
| `20260915070144` | `verify_0478_whole_syllabus_evidence_pass_20260915` | No |
| `20260915070241` | `verify_0478_knowledge_bundle_20260915` | No |
| `20260915070331` | `add_0478_required_knowledge_layers_v3_20260915` | No |
| `20260915070409` | `finalize_0478_verified_grounding_v2_20260915` | No |
| `20260915070429` | `promote_0478_2026_2028_production_verified_20260915` | No |
| `20260915070450` | `promote_0478_2026_2028_verified_v2_20260915` | No |
| `20260916023405` | `create_paper_learning_sessions` | Yes |
| `20260916084300` | `sync_profile_subjects_to_subject_catalog` | Yes |
| `20260916095027` | `harden_subject_catalog_against_general_fallback` | Yes |
| `20260916135749` | `remove_general_subjects_after_onboarding` | Yes |
| `20260916181802` | `create_paper_learning_attempts` | Yes |
| `20260916182015` | `create_platform_channel_message_receipts` | No |
| `20260916182027` | `create_platform_channel_link_codes` | Yes |
| `20260916183625` | `guard_general_subject_for_onboarded_users` | Yes |
| `20260917015059` | `align_whatsapp_message_receipts_lifecycle` | No |
| `20260917065445` | `create_paper_learning_attempts` | Yes |
| `20260919061134` | `paper_learning_transfer_mastery` | Yes |
| `20260920092654` | `protect_profiles_competitive_columns` | Yes |
| `20260923155355` | `add_retention_cleanup_infrastructure` | No |
| `20260926155841` | `20260926180000_canonicalize_subject_names` | Yes |
| `20260929144048` | `register_cambridge_9700_foundation` | No |
| `20260930121055` | `fix_signup_profile_rls_and_auth_trigger` | Yes |
| `20260930143953` | `harden_duplicate_indexes` | Yes |
| `20261003010105` | `cortex_generation_reconciliation` | Yes |
| `20261005051718` | `dedupe_cambridge_9709_knowledge_and_rekey_as_a_level` | No |
| `20261005051820` | `materialize_cambridge_9709_learning_outcomes_draft` | No |
| `20261005051841` | `promote_cambridge_9709_learning_outcomes_verified` | No |
| `20261005051929` | `promote_cambridge_9700_topic_rows_verified` | No |
| `20261005103942` | `topic_mastery_curriculum_topic_key` | Yes |
| `20261005104006` | `curriculum_topic_units_view` | No |
| `20261006194105` | `curriculum_topic_units_add_level` | No |
| `20261006200443` | `past_paper_battle_frozen_questions` | Yes |
| `20261009025705` | `battle_server_side_marking` | Yes |
| `20261010100902` | `revision_queue_allow_paper_learning_and_selfcheck_sources` | No |
| `20261011103112` | `atomic_timetable_replace` | Yes |
| `20261011105604` | `learner_brain_memory` | Yes |
| `20261012033052` | `learning_signals` | Yes |
| `20261013003053` | `lesson_library` | Yes |
| `20261013113122` | `lesson_library_dedupe_publish` | Yes |
| `20261019063529` | `feedback_submission_rate_limits` | Yes |
| `20261019064858` | `harden_feedback_table_grants` | Yes |
| `20261019181817` | `fix_lesson_completion_bridge_null_char` | Yes |
| `20261026133409` | `published_learning_assets` | Yes |
| `20261028060230` | `atomic_profile_subject_mutations` | Yes |
| `20261029015753` | `create_generated_lessons` | Yes |
| `20261102235937` | `lock_challenge_attempt_writes` | Yes |
| `20261103000241` | `restrict_challenge_attempt_reads` | Yes |
| `20261111003220` | `content_reviews` | Yes |
| `20261111050057` | `restore_has_role_execute_for_authenticated` | Yes |
| `20261111052639` | `teacher_portal_invites` | No |
| `20261111203852` | `teacher_tutorials` | No |
| `20261111205602` | `remove_simple_teacher_tutorials` | Yes |
| `20261111205620` | `teacher_tutorial_studio` | Yes |
| `20261111205628` | `harden_teacher_tutorial_access` | Yes |
| `20261112025707` | `scope_teacher_tutorial_reads` | Yes |
| `20261112025715` | `complete_tutorial_state_guards` | Yes |
| `20261112025723` | `atomic_tutorial_review_publish` | Yes |
| `20261112154024` | `exam_submission_ledger` | Yes |
| `20261112154552` | `atomic_cortex_exam_score` | Yes |
| `20261112155030` | `exam_completion_outbox` | Yes |
| `20261112155411` | `exam_completion_outbox_service_role_policy` | Yes |
| `20261112155730` | `atomic_exam_topic_mastery_projection` | Yes |
| `20261112161915` | `durable_exam_analytics_event` | Yes |
| `20261112162200` | `durable_recommendation_cache_versions` | Yes |
| `20261112173852` | `add_cortex_learning_context_fields` | Yes |
| `20261112174149` | `separate_cortex_weak_topics_from_subjects` | Yes |
| `20261112182321` | `add_last_practice_subject_context` | Yes |
| `20261112182406` | `add_last_practice_syllabus_context` | Yes |
| `20261112190256` | `atomic_canonical_learning_projection` | Yes |
| `20261113135150` | `invalidate_recommendations_from_learning_events` | Yes |
| `20261113135601` | `public_leaderboard_projection` | Yes |
| `20261113135641` | `harden_leaderboard_projection_invoker` | Yes |
| `20261113135648` | `syllabus_aware_learning_projection` | Yes |
| `20261113135853` | `syllabus_aware_exam_topic_projection` | Yes |
| `20261113135919` | `20260910232000_curriculum_assessment_mastery` | Yes |
| `20261113135930` | `20261114090000_idempotent_curriculum_quiz_assessment` | Yes |
| `20261113140129` | `20261114100000_server_verified_lesson_quiz_attempts` | Yes |
| `20261113140355` | `20261114110000_claim_lesson_quiz_submission` | Yes |
| `20261113141018` | `atomic_lesson_quiz_completion` | Yes |
| `20261113141246` | `restrict_curriculum_assessment_writes` | Yes |
| `20261113141351` | `syllabus_aware_exam_topic_keys` | Yes |
| `20261113142018` | `unify_lesson_quiz_topic_mastery` | Yes |
| `20261113142400` | `restore_atomic_quiz_topic_projection` | Yes |
| `20261113142908` | `durable_quiz_question_evidence` | Yes |

## Remote entries without a same-name tracked file

| Remote version | Recorded migration name |
| --- | --- |
| `20260724071442` | `create_increment_xp_function_fixed` |
| `20260724073745` | `create_generated_course_drafts_and_approvals` |
| `20260724073758` | `create_careers_skills_and_seed` |
| `20260724073839` | `seed_careers_and_skills` |
| `20260725112718` | `add_missing_rls_policies` |
| `20260726121555` | `migrate_existing_papers_to_combined_level` |
| `20260727083812` | `normalize_remaining_single_level_caie` |
| `20260806115153` | `enable_rls_cortex_and_content_tables` |
| `20260806165359` | `fix_function_search_path_mutable` |
| `20260806165434` | `fix_increment_xp_ownership_guard` |
| `20260807094658` | `fix_increment_xp_service_role_regression` |
| `20260813025958` | `create_study_plans` |
| `20260813085220` | `add_streak_freeze_week_to_cortex_memory` |
| `20260813090110` | `add_weekly_goal_minutes_to_profiles` |
| `20260816175542` | `add_traction_feedback_experiments_exports` |
| `20260816181128` | `add_traction_metrics_and_export_logging` |
| `20260816181303` | `harden_survey_response_uniqueness` |
| `20260816181420` | `fix_retention_eligibility_windows` |
| `20260828192445` | `create_project_studio` |
| `20260901185719` | `extend_topic_mastery_with_local_state` |
| `20260901201020` | `fix_sync_revision_client_version_type` |
| `20260908041315` | `protect_exam_results_from_public_reads` |
| `20260908042402` | `add_traction_event_idempotency` |
| `20260908044202` | `instrument_learning_lesson_analytics` |
| `20260909202608` | `add_curriculum_document_structure` |
| `20260911112810` | `create_platform_relationships` |
| `20260911194944` | `add_curriculum_completeness_framework` |
| `20260911200046` | `add_curriculum_seed_function_metadata` |
| `20260911200155` | `test_curriculum_registry_expansion` |
| `20260911210345` | `secure_curriculum_coverage_tables` |
| `20260911232227` | `create_platform_channel_identity_registry` |
| `20260912182257` | `seed_0478_2026_2028_granular_content_map` |
| `20260912182314` | `record_0478_coverage_evidence_progress` |
| `20260912184731` | `reconcile_0478_full_assessment_guidance` |
| `20260915070144` | `verify_0478_whole_syllabus_evidence_pass_20260915` |
| `20260915070241` | `verify_0478_knowledge_bundle_20260915` |
| `20260915070331` | `add_0478_required_knowledge_layers_v3_20260915` |
| `20260915070409` | `finalize_0478_verified_grounding_v2_20260915` |
| `20260915070429` | `promote_0478_2026_2028_production_verified_20260915` |
| `20260915070450` | `promote_0478_2026_2028_verified_v2_20260915` |
| `20260916182015` | `create_platform_channel_message_receipts` |
| `20260917015059` | `align_whatsapp_message_receipts_lifecycle` |
| `20260923155355` | `add_retention_cleanup_infrastructure` |
| `20260929144048` | `register_cambridge_9700_foundation` |
| `20261005051718` | `dedupe_cambridge_9709_knowledge_and_rekey_as_a_level` |
| `20261005051820` | `materialize_cambridge_9709_learning_outcomes_draft` |
| `20261005051841` | `promote_cambridge_9709_learning_outcomes_verified` |
| `20261005051929` | `promote_cambridge_9700_topic_rows_verified` |
| `20261005104006` | `curriculum_topic_units_view` |
| `20261006194105` | `curriculum_topic_units_add_level` |
| `20261010100902` | `revision_queue_allow_paper_learning_and_selfcheck_sources` |
| `20261111052639` | `teacher_portal_invites` |
| `20261111203852` | `teacher_tutorials` |

## Tracked SQL files without a same-name remote ledger entry

- `0001_create_daily_challenges_table.sql`
- `0003_create_learn_lessons_table.sql`
- `0005_add_enrolled_courses_to_user_profiles.sql`
- `0006_add_rls_policies.sql`
- `0007_add_country_examboard_to_user_profiles.sql`
- `0008_add_constraints_lesson_prerequisites.sql`
- `0009_dedupe_lesson_prerequisites.sql`
- `0010_create_generated_course_drafts_table.sql`
- `0011_create_generated_course_approvals_table.sql`
- `0012_create_careers_table.sql`
- `0013_create_skills_and_mappings.sql`
- `0014_seed_careers.sql`
- `0015_create_user_careers_table.sql`
- `0016_create_cortex_insights_table.sql`
- `0021_add_onboarding_tour_flags_to_user_profiles.sql`
- `0022_create_increment_xp_function.sql`
- `0024_atomic_focus_xp.sql`
- `20260816212000_harden_security_definer_function_grants.sql`
- `20260816213500_harden_get_traction_metrics_grants.sql`
- `20260908152000_seed_primary_activity_content.sql`
- `20260909161000_curriculum_ingestion.sql`
- `20260917050000_create_platform_channel_identities.sql`
- `20260917051000_harden_platform_channel_message_receipts.sql`
- `20260918131000_harden_rpc_execute_and_search_path.sql`
- `20260918132000_reconcile_platform_channel_identities.sql`
- `20260918132100_reconcile_platform_channel_link_codes.sql`
- `20260918132200_reconcile_platform_channel_message_receipts.sql`
- `20260918220000_add_paper_learning_session_progress.sql`
- `20260919110000_paper_learning_idempotent_actions.sql`
- `20260919113000_paper_learning_transfer_claim.sql`
- `20260919170000_harden_internal_security_surface.sql`
- `20260923170000_cortex_generation_jobs.sql`
- `20260926193000_seed_cambridge_9702_knowledge.sql`
- `20260929123000_seed_cambridge_9701_scope.sql`
- `20260929150000_seed_cambridge_9701_as_outcomes_1_12.sql`
- `20260929152000_seed_cambridge_9701_knowledge.sql`
- `20260930150000_harden_user_profiles_auth_sync.sql`
- `20260930151500_harden_revision_queue_rpc.sql`
- `20261002145500_cortex_generation_leases.sql`
- `20261002170000_cortex_atomic_checkpoints.sql`
- `20261009180000_revision_queue_sources.sql`
- `20261021000000_add_curriculum_document_snapshots.sql`
- `20261112090000_teacher_portal.sql`
- `20261115190000_harden_canonical_event_ingress_evidence.sql`

## Required reconciliation procedure

1. Preserve this ledger snapshot and the tracked directory listing as dated evidence.
2. For every unmatched remote entry and tracked file, inspect Git history and SQL content to identify renames, squashes, superseded migrations, or genuinely untracked changes. Do not pair files solely because their names look similar.
3. Export an authoritative schema-only baseline from the live project using supported Supabase tooling, including extensions, schemas, roles/grants, RLS, policies, functions, triggers, constraints, indexes, and storage metadata. Exclude user data and secrets.
4. Build a disposable database from the proposed baseline and compare normalized catalog state against a fresh read-only live catalog snapshot.
5. Document intentional differences and prove that the baseline is reproducible in CI before using it for account-deletion integration tests.
6. Do not rewrite the remote migration ledger, apply account-deletion DDL, or activate the deletion worker during reconciliation.

## Safety

No production DDL, data, Auth users, Storage objects, or worker settings were changed to create this report. The account-deletion worker remains disabled.

## Git-history evidence: some mismatches are intentional filename/version repairs

The migration directory's own Git history confirms that at least part of the filename mismatch is caused by deliberate alignment work, not necessarily missing SQL:

- Commit [`532a2c4b51a226caf06daf10f378ed42375ee2ff`](https://github.com/mahambatakunda2008-afk/shadecode-student/commit/532a2c4b51a226caf06daf10f378ed42375ee2ff) renamed the exact curriculum profile migration to a unique version after a duplicate `20260909210000` version was identified.
- Commit [`7aab2333956d68785714d1609323bb885eb70411`](https://github.com/mahambatakunda2008-afk/shadecode-student/commit/7aab2333956d68785714d1609323bb885eb70411) aligned the lesson-quiz migration filename with the already-applied Supabase version; commit [`9721b35689d4e976bcb33684ce3a60d257c76185`](https://github.com/mahambatakunda2008-afk/shadecode-student/commit/9721b35689d4e976bcb33684ce3a60d257c76185) then removed the superseded filename.
- Commits [`a466cdaf9ccd15632f38df3b1050b7fa93e970ee`](https://github.com/mahambatakunda2008-afk/shadecode-student/commit/a466cdaf9ccd15632f38df3b1050b7fa93e970ee) and [`9cf6794e0daa1a06870079f2ebaec779e4d590da`](https://github.com/mahambatakunda2008-afk/shadecode-student/commit/9cf6794e0daa1a06870079f2ebaec779e4d590da) show a migration being reintroduced under the applied versioned filename and the old mismatched filename removed.

This is direct evidence that the raw filename/ledger mismatch includes deliberate repair history. It still does not map all 53 unmatched remote names and 44 unmatched tracked files. Continue mapping each item through content, commit history, and remote schema effects. Do not bulk-rename files or mark migrations as applied based only on this evidence.


## Additional commit-history reconciliation evidence (2026-11-16)

Two historical commits were inspected by their full commit messages and patches. They establish specific migration-history facts, but do not justify blanket filename pairing:

1. Commit `4dd7c93313dffcfa62d6d7cc83a2ce3518f08ec7` records that `log_ai_usage` and `increment_xp` had been applied directly to production through Supabase MCP, then the repository was repaired so migrations remained the source of truth. The commit explicitly identifies tracked `0020_create_ai_usage_tracking.sql` as applied unchanged and tracked `0022_create_increment_xp_function.sql` as requiring a schema correction because production profiles had no `updated_at` column. The remote ledger's unmatched `create_increment_xp_function_fixed` entry is therefore associated with a directly-applied production function and a later tracked migration repair, but exact SQL equivalence of the remote ledger entry to the final tracked file is **not established** by this commit message alone.
2. Commit `1249db5d2b1cb1afb15305a82814faf382bd02fd` documents that four divergent daily-challenges migrations were deduplicated after comparing the live production schema and policy name, retaining the versioned migration renamed to `0001_*` and deleting three never-applied variants. It also records RLS repairs for eight tables, including careers/skills, lesson prerequisites, user_careers, generated_course_drafts, and generated_course_approvals. This supports intentional migration cleanup and schema repair as sources of filename mismatch, but does not map every unmatched remote ledger row to a specific tracked file.

A third inspected commit, `1a71064ff7827acd96bd41aae93b2bd878a87c2f`, documents the original AI-assisted study-planning feature and its persisted `study_plans` data structure. It is feature-history evidence only; no migration equivalence was inferred.

### Reconciliation classification update

- **Verified history fact:** some production schema changes were applied directly, outside the normal migration ledger workflow, and later backfilled/repaired in tracked migrations.
- **Verified history fact:** duplicate/obsolete migration files were intentionally removed after comparison with live production state.
- **Not yet verified:** the exact SQL body and schema effect for each of the 53 remote-only names and 44 tracked-only files.
- **Not yet verified:** whether the current migration directory can recreate the live schema from an empty database without manual patches or skipped historical migrations.

Do not use the above evidence to mark migrations as applied, alter the remote ledger, or assume a one-to-one mapping. Continue content-level comparison and disposable replay.


## Path-specific Git-history pass (2026-11-16)

The current directory listing contains **161 entries: 160 `.sql` files plus the README**. This confirms the earlier 160-SQL-file count; the 161 figure is the directory-entry count, not an additional migration.

I inspected GitHub's path history for five tracked files that appeared in the unmatched tracked-file list. This narrows their provenance but does not prove they were applied under a particular remote version:

| Tracked file | First/only path-history commit | What is established | Reconciliation status |
| --- | --- | --- | --- |
| `20261112090000_teacher_portal.sql` | `b838014bed40` (2026-11-11) | Introduced the teacher portal's own schema in the Teacher Client feature commit. The remote ledger separately records `teacher_portal_invites` and `teacher_tutorials` under versions `20261111052639` and `20261111203852`. | Plausible split/combined migration relationship; **not proven equivalent**. Inspect full SQL and deployment history before pairing. |
| `20260917050000_create_platform_channel_identities.sql` | `a2e6bd09acad` (2026-09-17) | Introduced persistent channel identity schema. | Remote has earlier registry and later channel identity entries; **no exact mapping proven**. |
| `20260917051000_harden_platform_channel_message_receipts.sql` | `c7cc53f4d4e5` (2026-09-17) | Introduced receipt lifecycle hardening. | Remote ledger has receipt creation and lifecycle-alignment entries; **no exact mapping proven**. |
| `20260909161000_curriculum_ingestion.sql` | `92ec4ee7ea6a` (2026-09-09) | Introduced curriculum ingestion migration. | Remote ledger has multiple curriculum source/document/coverage entries; **no exact mapping proven**. |
| `20260816212000_harden_security_definer_function_grants.sql` | `fd5fe658ef96` (2026-08-16) | Introduced SECURITY DEFINER helper grant hardening. | Remote ledger includes multiple search-path and grant-hardening entries; **no exact mapping proven**. |

The path-history endpoint returned one introducing commit for each of these files. It does not expose a remote SQL body for already-applied migration records, so a filename or topical similarity is not enough to claim SQL equivalence.

### Updated classification

- The directory count is reconciled: 160 SQL files, plus README.
- The earlier deliberate rename/removal examples remain verified.
- Five additional tracked files now have their introducing commits recorded.
- None of these five has been upgraded to an exact remote-ledger match without a patch/content proof.
- The complete 53 remote-only / 44 tracked-only lists remain open for item-by-item reconciliation.

### Next verification step

Retrieve the introducing commit patches for each tracked-only file and compare their SQL effects against the live schema definitions and relevant later migrations. For remote-only entries whose SQL was applied outside tracked history, use commit messages, deployment records, and catalog effects as evidence, but label the result as inferred unless the exact SQL artifact is recovered. Preserve the remote ledger unchanged.


## SQL-patch inspection: five tracked-only files (2026-11-16)

The introducing commit patches were retrieved for the five tracked-only files previously identified. This is stronger evidence than filename/path history, but only establishes what those tracked files actually contain. It does **not** establish that a remote ledger entry with a similar name or purpose contains identical SQL.

| Tracked file | Introducing commit | Exact patch content observed | Reconciliation result |
| --- | --- | --- | --- |
| `20261112090000_teacher_portal.sql` | `b838014bed40501f7407f417f026a1285eac0b77` | Creates `teacher_invites`, invite hash/expiry/use fields, RLS policies, and atomic `redeem_teacher_invite(text)`; its `created_by` FK cascades and `used_by` FK sets null. | The live ledger has separate `teacher_portal_invites` (20261111052639) and `teacher_tutorials` (20261111203852), followed by tutorial hardening/state migrations. The tracked file patch is invite-specific and does not define the tutorial schema. **Not equivalent to the complete remote teacher portal history.** |
| `20260917050000_create_platform_channel_identities.sql` | `a2e6bd09acad` | Creates `platform_channel_identities` with WhatsApp channel constraint, unique external identity, Auth-user CASCADE FK, index, and RLS enabled. | Remote ledger has `create_platform_channel_identity_registry` (20260911232227), preceding the tracked file's introducing commit, plus later platform-channel reconciliation history. Similar object purpose is insufficient to map these entries. **Unresolved; likely later additive/reconciliation SQL.** |
| `20260917051000_harden_platform_channel_message_receipts.sql` | `c7cc53f4d4e5` | Creates/extends receipt lifecycle columns, backfills null lifecycle values, adds status/channel constraints and processing/user indexes, and enables RLS. | Remote ledger separately records receipt creation (20260916182015) and lifecycle alignment (20260917015059). The tracked patch combines create/upgrade logic, but exact equivalence to either or both remote SQL bodies cannot be proven without recovering those bodies. **Unresolved; candidate combined/squashed migration only.** |
| `20260909161000_curriculum_ingestion.sql` | `92ec4ee7ea6a` | Creates curriculum source/document/version/objective/mapping/ingestion/verification tables, indexes, RLS, timestamp trigger function, and four source seeds. Its own header says initial schema was applied to production during implementation and this file is the reproducible repository definition for future environments. | The remote ledger has numerous curriculum entries, including source identity/guards, knowledge, document structure, exact profiles, coverage, assessment, and later projections. This 110-line tracked patch is a foundation, not the whole curriculum history. **Confirmed partial baseline artifact; not a one-to-one remote migration match.** |
| `20260816212000_harden_security_definer_function_grants.sql` | `fd5fe658ef96` | Replaces `has_role`, `has_permission`, and `get_user_permissions` with identity checks and restricted search paths; revokes selected anon execute grants, including helper/trigger functions. | The remote ledger contains multiple function search-path, role-grant, ownership-guard, and service-role regression migrations. The patch is one security-hardening layer, not proof that it subsumes those remote changes. **Unresolved; compare each function definition and ACL in the live catalog.** |

### What this proves, and what it does not

- We now have patch-level evidence for five tracked-only migrations, not merely their filenames and introducing commits.
- At least three mismatches are clearly multi-stage histories: curriculum ingestion, platform channel receipts, and the teacher portal. The tracked file set is not a one-file-per-ledger-entry representation.
- The teacher portal tracked migration specifically creates invites only; the live remote ledger separately records tutorial schema and multiple tutorial lifecycle/security migrations. Do not claim the tracked invite migration reproduces the live teacher portal schema.
- The curriculum migration explicitly documents a production-first application followed by a repository reproducibility artifact. This is direct evidence of out-of-band/production-first schema creation, but not a substitute for recovering every later remote migration's SQL.
- The platform channel identity file creates the identity table, but the remote ledger's registry entry predates it. This requires examining the live table's columns/constraints and all follow-on reconciliation migrations before assigning a mapping.
- No remote migration SQL body was recovered by this pass. Therefore **no remote-only migration has been declared equivalent to a tracked file**.

## CI status update

The latest commit on this audit branch, `6c689342f576f94c2a8a41a3cc78ce24d6e64f71`, now reports the Vercel check as **success** (previously pending). This is a deployment/check status only; it does not validate migration replay or database equivalence.

## Remaining authoritative work

1. Recover exact SQL for remote-only entries from deployment artifacts, archived migration files, CI artifacts, or a verified schema-history source. Where no exact artifact exists, record an evidence-based inferred mapping and confidence, never a guessed equivalence.
2. Compare the five tracked patches above against current live definitions for the affected tables/functions, including RLS policies, grants, triggers, constraints, and indexes.
3. Expand the same patch-level method across all 44 tracked-only files and 53 remote-only entries; prioritize security, identity, curriculum, and durable assessment/projection migrations.
4. Export a supported schema-only baseline and prove a disposable replay/restore produces equivalent normalized catalog state.
5. Keep production migration ledger, production DDL, account data, Storage objects, and deletion-worker settings unchanged until the baseline is independently reproducible and reviewed.


## Live catalog comparison for the five tracked patches (2026-11-16)

A fresh read-only catalog query compared the relevant live tables, columns, constraints, indexes, RLS policies, and selected function definitions. This narrows the comparison but is not a full schema dump.

### Teacher portal: invite migration is present, tutorials are separate

- Live `teacher_invites` has the exact eight columns and defaults defined by the tracked `20261112090000_teacher_portal.sql`: UUID id, unique code hash, optional note, creator, creation/expiry timestamps, optional used-by identity, and used timestamp.
- Its two Auth foreign keys match the tracked patch's intended delete actions: `created_by ON DELETE CASCADE`; `used_by ON DELETE SET NULL`.
- The three invite RLS policies match the tracked migration's admin-only read/create/revoke boundaries.
- Live `redeem_teacher_invite(text)` has the same atomic hash lookup, unused/unexpired condition, teacher-role assignment, and conflict handling as the tracked patch. Its current ACL grants execute to `authenticated` and `service_role`, not `anon` or `PUBLIC`.
- Live `teacher_tutorials` is a distinct table with author CASCADE and publisher SET NULL Auth FKs, workflow status/version/content constraints, and separate author/reviewer/admin RLS policies. This confirms that the tracked invite migration does not represent the tutorial schema.

**Classification:** the tracked teacher migration's invite component is materially present in the live catalog. It still cannot be mapped one-to-one to the remote ledger entries without their SQL bodies. The separate tutorial schema and its policies must be covered by the remote-history/baseline reconciliation.

### Platform channel receipts: lifecycle patch largely reflected in live catalog

- Live `platform_channel_message_receipts` contains the receipt lifecycle fields, non-null `phone_number_id`, `processing_started_at`, and `lease_until`, plus nullable `user_id`, delivery status, processed/delivered timestamps.
- Live status, delivery, and channel checks match the tracked lifecycle migration's intended allowed values.
- Live indexes include the tracked partial lease index and user/time index, plus a separate processing-started index and a uniquely named message index.
- RLS is enabled, with an explicit deny policy for anon/authenticated API access.

**Classification:** strong catalog evidence that the tracked lifecycle migration's effects are present, with additional later changes. This does not prove whether remote versions 20260916182015 and 20260917015059 individually correspond to the create and lifecycle portions; retain the mapping as a candidate combined history, not exact equivalence.

### Curriculum ingestion: live schema is a later evolved state

The live curriculum tables retain the original foundation but have subsequent changes. Examples from the read-only catalog:

- `curriculum_sources` now has `syllabus_id` and `syllabus_version` plus an identity index, beyond the original tracked foundation.
- `curriculum_documents` now has extraction metadata (`page_count`, `structure`, `extraction_engine`, `extraction_version`, `extraction_status`) and an extraction-status index. Its current status constraint is narrower/different from the original migration's initial status list.
- `curriculum_versions` and `curriculum_objectives` now have evolved status constraints and status indexes.
- `curriculum_ingestion_changes` has additional verification indexing and a later change-type constraint alongside the earlier broader constraint.
- All inspected curriculum tables have RLS enabled. Current policies deny direct anon/authenticated access to operational ingestion/source/evidence tables, while allowing authenticated reads of non-archived curriculum versions/objectives.

**Classification:** the tracked 110-line curriculum file is a genuine foundation artifact, but the live schema includes later migrations and policy evolution. The tracked file alone cannot be treated as a complete production baseline.

### Platform channel identities and SECURITY DEFINER functions

- The live catalog query confirms `platform_channel_identities` has RLS enabled and an explicit deny policy for direct anon/authenticated access. The full column/constraint inventory should be compared separately against the original identity patch and later reconciliation migrations.
- Live `has_role`, `has_permission`, and `get_user_permissions` retain same-user/service-role identity checks from the tracked hardening patch. Their live search path is `public`; the tracked introducing patch used `public, pg_temp`. This difference needs explicit reconciliation with later search-path migrations rather than assuming byte-for-byte equivalence.
- Live ACLs for `has_role` allow authenticated execution; `has_permission` and `get_user_permissions` are limited to postgres/service_role in the observed ACL.
- Live `set_curriculum_updated_at()` is a non-SECURITY-DEFINER trigger function; its default execute ACL remains broader than the trigger-only runtime need. Review against the least-privilege function inventory, but do not change grants as part of this read-only pass.

### Scope of this comparison

This is evidence of current catalog effects, not proof of the exact historical migration sequence. It does not recover the remote SQL bodies, establish an empty-database replay, or validate all grants/triggers/storage metadata. The migration ledger remains unchanged, and no production DDL or data was modified.
