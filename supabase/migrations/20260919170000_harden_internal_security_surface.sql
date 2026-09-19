-- Harden internal Supabase tables and SECURITY DEFINER search paths.
-- Applied to production project zczdtffwzkctkxwmvalb on 2026-09-19.
-- Internal tables remain server-side infrastructure and must not be exposed
-- through the anon/authenticated Data API.

begin;

do $$
declare t text;
begin
  foreach t in array array[
    'curriculum_documents',
    'curriculum_ingestion_changes',
    'curriculum_ingestion_runs',
    'curriculum_sources',
    'curriculum_verification_events',
    'exam_logs',
    'insights_archive',
    'objective_skill_mappings',
    'platform_channel_identities',
    'platform_channel_link_codes',
    'platform_channel_message_receipts'
  ] loop
    execute format('drop policy if exists "deny_public_data_api" on public.%I', t);
    execute format(
      'create policy "deny_public_data_api" on public.%I for all to anon, authenticated using (false) with check (false)',
      t
    );
  end loop;
end $$;

alter function public.get_user_permissions(uuid) set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.has_permission(uuid, text) set search_path = public;
alter function public.has_role(uuid, text) set search_path = public;
alter function public.increment_xp(uuid, integer) set search_path = public;
alter function public.upsert_revision_item(uuid, text, text, text) set search_path = public;

-- RPCs that are admin/internal-only must not be callable directly through
-- the authenticated Data API. Server-side trusted code uses service_role.
revoke execute on function public.get_traction_metrics() from authenticated;
revoke execute on function public.get_user_permissions(uuid) from authenticated;
revoke execute on function public.has_permission(uuid, text) from authenticated;
revoke execute on function public.has_role(uuid, text) from authenticated;
revoke execute on function public.review_exam_question_topic_proposal(uuid, text) from authenticated;

commit;
