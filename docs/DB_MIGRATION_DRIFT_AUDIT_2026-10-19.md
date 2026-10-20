# Supabase Migration History vs Repository Inventory

**Inspection date:** 2026-10-19  
**Project:** Shadecode Student production Supabase project  
**Method:** Read-only comparison of the remote Supabase migration ledger and tracked `supabase/migrations/*.sql` filenames.

## Executive finding

The remote ledger reports **124 migration entries**. The main branch contains **113 tracked SQL migration files**. An exact-name comparison found **57 remote migration names with no exact tracked filename-stem match** and **46 tracked SQL files with no exact remote migration-name match**.

**These counts are a drift signal, not a claim that 57 migrations are definitely absent.** Migration versions and filenames sometimes use different timestamps or aliases; SQL may have been renamed, consolidated, applied manually, or omitted from Git. Do not blindly reapply remote migrations, fabricate replacement files, or mark historical migrations as applied based on names alone.

## Follow-up after the initial snapshot

After the inventory above was captured, the additive feedback rate-limit migration was applied to the production project on 2026-10-19 through the managed Supabase migration action. The remote ledger now contains version `20261019063529`, name `feedback_submission_rate_limits`. Read-only verification confirmed:

- `public.feedback_rate_limits` exists.
- `public.consume_feedback_rate_limit(text, integer, integer)` exists.
- The limiter table has no table privileges for `anon` or `authenticated`; `service_role` has the privileges needed by the RPC.
- The function's EXECUTE privilege is granted to `service_role` and not to `anon` or `authenticated`.

The PR branch now contains `supabase/migrations/20261019063529_feedback_submission_rate_limits.sql`, matching the observed remote version/name. The baseline counts above intentionally describe the pre-follow-up snapshot. PR #390 has since merged; `main` now contains `supabase/migrations/20261019063529_feedback_submission_rate_limits.sql`, matching the applied remote version.

A second security-hardening migration was applied after PR #392's production deployment reached READY. The remote ledger records `20261019064858` / `harden_feedback_table_grants`. Read-only verification confirmed `anon` and `authenticated` have no direct table privileges on `public.feedback`; only `postgres` and `service_role` appear in the table-grant inventory. The 8 existing feedback rows remained intact. The matching tracked filename is `supabase/migrations/20261019064858_harden_feedback_table_grants.sql` on this follow-up branch.

## Remote ledger entries without an exact filename-stem match

| Remote version | Remote migration name |
|---|---|
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
| `20260830103626` | `add_canonical_event_idempotency` |
| `20260830190807` | `fix_cortex_events_uuid_default` |
| `20260901185719` | `extend_topic_mastery_with_local_state` |
| `20260901193712` | `20260901193000_make_cortex_event_ingress_pure` |
| `20260901201020` | `fix_sync_revision_client_version_type` |
| `20260908041315` | `protect_exam_results_from_public_reads` |
| `20260908042402` | `add_traction_event_idempotency` |
| `20260908044202` | `instrument_learning_lesson_analytics` |
| `20260909191516` | `20260909203000_add_curriculum_knowledge` |
| `20260909202608` | `add_curriculum_document_structure` |
| `20260910203854` | `20260910223000_auto_attach_curriculum_to_lessons` |
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
| `20260926155841` | `20260926180000_canonicalize_subject_names` |
| `20260929144048` | `register_cambridge_9700_foundation` |
| `20261005051718` | `dedupe_cambridge_9709_knowledge_and_rekey_as_a_level` |
| `20261005051820` | `materialize_cambridge_9709_learning_outcomes_draft` |
| `20261005051841` | `promote_cambridge_9709_learning_outcomes_verified` |
| `20261005051929` | `promote_cambridge_9700_topic_rows_verified` |
| `20261005104006` | `curriculum_topic_units_view` |
| `20261006194105` | `curriculum_topic_units_add_level` |
| `20261010100902` | `revision_queue_allow_paper_learning_and_selfcheck_sources` |

## Tracked SQL filenames without an exact remote migration-name match

| Tracked file | Filename stem |
|---|---|
| `0001_create_daily_challenges_table.sql` | `create_daily_challenges_table` |
| `0003_create_learn_lessons_table.sql` | `create_learn_lessons_table` |
| `0005_add_enrolled_courses_to_user_profiles.sql` | `add_enrolled_courses_to_user_profiles` |
| `0006_add_rls_policies.sql` | `add_rls_policies` |
| `0007_add_country_examboard_to_user_profiles.sql` | `add_country_examboard_to_user_profiles` |
| `0008_add_constraints_lesson_prerequisites.sql` | `add_constraints_lesson_prerequisites` |
| `0009_dedupe_lesson_prerequisites.sql` | `dedupe_lesson_prerequisites` |
| `0010_create_generated_course_drafts_table.sql` | `create_generated_course_drafts_table` |
| `0011_create_generated_course_approvals_table.sql` | `create_generated_course_approvals_table` |
| `0012_create_careers_table.sql` | `create_careers_table` |
| `0013_create_skills_and_mappings.sql` | `create_skills_and_mappings` |
| `0014_seed_careers.sql` | `seed_careers` |
| `0015_create_user_careers_table.sql` | `create_user_careers_table` |
| `0016_create_cortex_insights_table.sql` | `create_cortex_insights_table` |
| `0021_add_onboarding_tour_flags_to_user_profiles.sql` | `add_onboarding_tour_flags_to_user_profiles` |
| `0022_create_increment_xp_function.sql` | `create_increment_xp_function` |
| `0024_atomic_focus_xp.sql` | `atomic_focus_xp` |
| `20260816212000_harden_security_definer_function_grants.sql` | `harden_security_definer_function_grants` |
| `20260816213500_harden_get_traction_metrics_grants.sql` | `harden_get_traction_metrics_grants` |
| `20260901193000_make_cortex_event_ingress_pure.sql` | `make_cortex_event_ingress_pure` |
| `20260908152000_seed_primary_activity_content.sql` | `seed_primary_activity_content` |
| `20260909161000_curriculum_ingestion.sql` | `curriculum_ingestion` |
| `20260909203000_add_curriculum_knowledge.sql` | `add_curriculum_knowledge` |
| `20260910223000_auto_attach_curriculum_to_lessons.sql` | `auto_attach_curriculum_to_lessons` |
| `20260910232000_curriculum_assessment_mastery.sql` | `curriculum_assessment_mastery` |
| `20260917050000_create_platform_channel_identities.sql` | `create_platform_channel_identities` |
| `20260917051000_harden_platform_channel_message_receipts.sql` | `harden_platform_channel_message_receipts` |
| `20260918131000_harden_rpc_execute_and_search_path.sql` | `harden_rpc_execute_and_search_path` |
| `20260918132000_reconcile_platform_channel_identities.sql` | `reconcile_platform_channel_identities` |
| `20260918132100_reconcile_platform_channel_link_codes.sql` | `reconcile_platform_channel_link_codes` |
| `20260918132200_reconcile_platform_channel_message_receipts.sql` | `reconcile_platform_channel_message_receipts` |
| `20260918220000_add_paper_learning_session_progress.sql` | `add_paper_learning_session_progress` |
| `20260919110000_paper_learning_idempotent_actions.sql` | `paper_learning_idempotent_actions` |
| `20260919113000_paper_learning_transfer_claim.sql` | `paper_learning_transfer_claim` |
| `20260919170000_harden_internal_security_surface.sql` | `harden_internal_security_surface` |
| `20260923170000_cortex_generation_jobs.sql` | `cortex_generation_jobs` |
| `20260926180000_canonicalize_subject_names.sql` | `canonicalize_subject_names` |
| `20260926193000_seed_cambridge_9702_knowledge.sql` | `seed_cambridge_9702_knowledge` |
| `20260929123000_seed_cambridge_9701_scope.sql` | `seed_cambridge_9701_scope` |
| `20260929150000_seed_cambridge_9701_as_outcomes_1_12.sql` | `seed_cambridge_9701_as_outcomes_1_12` |
| `20260929152000_seed_cambridge_9701_knowledge.sql` | `seed_cambridge_9701_knowledge` |
| `20260930150000_harden_user_profiles_auth_sync.sql` | `harden_user_profiles_auth_sync` |
| `20260930151500_harden_revision_queue_rpc.sql` | `harden_revision_queue_rpc` |
| `20261002145500_cortex_generation_leases.sql` | `cortex_generation_leases` |
| `20261002170000_cortex_atomic_checkpoints.sql` | `cortex_atomic_checkpoints` |
| `20261009180000_revision_queue_sources.sql` | `revision_queue_sources` |

## Safe reconciliation procedure

1. Preserve a fresh schema and data backup before any migration-ledger edits or DDL changes.
2. For each unmatched remote entry, identify the original SQL from version control, deployment artifacts, or the actual deployed schema. Record evidence for any renamed or consolidated migration.
3. Compare each candidate SQL migration against the live schema, functions, triggers, policies, grants and indexes. A matching table name alone is not sufficient.
4. Classify each item as **matched**, **renamed/aliased**, **applied manually**, **superseded**, **missing SQL**, or **unresolved**. Record the evidence and responsible reviewer.
5. Do not re-run historical DDL or change the migration ledger merely to make names line up. If a migration is truly missing from Git but already applied in production, recover the original SQL when possible and document the historical reconstruction rather than executing it again.
6. New migrations should have one canonical tracked filename and be applied in a controlled order to the intended environment. Verify the new migration's remote ledger entry and resulting schema before deploying code that depends on it.
7. Keep the feedback rate-limit migration separate from this historical reconciliation. The new `consume_feedback_rate_limit` RPC must exist in the target environment before `POST /api/feedback` is deployed; otherwise the route intentionally fails closed.

## Current feedback-related implication

The new rate-limit migration proposed in PR #390 has **not** been applied to production. It adds a private rate-limit bucket table and a service-role-only atomic RPC. Do not merge/deploy the new route until the migration has been reviewed and applied, and the RPC has been verified. The historical migration drift remains unresolved and must not be hidden by the new migration.

