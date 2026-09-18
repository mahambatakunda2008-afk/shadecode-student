-- Harden trigger-only curriculum RPCs and pin mutable function search paths.
-- These changes are intentionally narrow: no learner-facing table policy is invented
-- without first verifying the route/data-access contract.

revoke execute on function public.attach_verified_curriculum_to_lesson() from public, anon, authenticated;
revoke execute on function public.enforce_onboarding_subjects() from public, anon, authenticated;
revoke execute on function public.sync_completed_lesson_curriculum_objectives() from public, anon, authenticated;
revoke execute on function public.sync_lesson_curriculum_objective_progress() from public, anon, authenticated;

alter function public.set_paper_learning_session_updated_at()
  set search_path = public, pg_temp;

alter function public.guard_general_subject_for_onboarded_user()
  set search_path = public, pg_temp;

alter function public.get_next_curriculum_objective(uuid)
  set search_path = public, pg_temp;

alter function public.touch_curriculum_objective_learning(uuid, text[])
  set search_path = public, pg_temp;

alter function public.record_curriculum_lesson_completion(uuid, text[])
  set search_path = public, pg_temp;
