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
