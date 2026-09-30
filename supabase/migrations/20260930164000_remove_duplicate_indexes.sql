-- Remove exact duplicate indexes reported by the Supabase performance advisor.
-- Keep the *_created_at indexes because they are identical to the older names.
drop index if exists public.paper_learning_attempts_session_idx;
drop index if exists public.traction_events_name_created_idx;
drop index if exists public.traction_events_user_created_idx;
