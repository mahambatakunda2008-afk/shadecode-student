-- Tighten grants on trigger-only SECURITY DEFINER functions and private answer keys.
--
-- These three functions are invoked exclusively by database triggers. They are
-- not RPC entry points and must not be directly executable by API roles.
-- PostgreSQL checks trigger-function EXECUTE permission when CREATE TRIGGER is
-- issued, not when the trigger subsequently fires.
revoke all privileges on function public.apply_lesson_vote() from public, anon, authenticated, service_role;
revoke all privileges on function public.guard_teacher_tutorial_transition() from public, anon, authenticated, service_role;
revoke all privileges on function public.publish_lesson_to_library() from public, anon, authenticated, service_role;

-- Canonical event insertion is authenticated-user scoped by auth.uid(); an
-- anonymous caller can never satisfy that contract. Keep authenticated and
-- service_role access unchanged.
revoke execute on function public.insert_canonical_cortex_event(uuid, jsonb) from public, anon;

-- Answer keys are server-side assessment material. The application reads them
-- through its trusted server/service-role path, never directly from browser
-- roles. RLS without policies is a second barrier, not a substitute for grants.
revoke all privileges on table public.challenge_answer_keys from public, anon, authenticated;
