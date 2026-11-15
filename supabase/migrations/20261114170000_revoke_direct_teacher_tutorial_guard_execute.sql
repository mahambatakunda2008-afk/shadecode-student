-- Trigger-only guard: it must run through the existing table trigger, never as a callable RPC.
-- PostgreSQL checks function EXECUTE permission when the trigger is created, not on each row update.
-- Keep the trigger attached while removing direct invocation grants from API-facing roles.
revoke all on function public.guard_teacher_tutorial_transition()
  from public, anon, authenticated, service_role;
