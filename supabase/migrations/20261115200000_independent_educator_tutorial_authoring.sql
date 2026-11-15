-- Approved independent educators may author their own tutorials without acquiring school roles.
-- Review and publication authority remains global teacher/admin only.
drop policy if exists "authors create own draft tutorials" on public.teacher_tutorials;
create policy "authors create own draft tutorials" on public.teacher_tutorials
  for insert to authenticated with check (
    author_id = auth.uid()
    and status = 'draft'
    and version = 1
    and published_at is null
    and published_by is null
    and (
      has_role(auth.uid(), 'teacher'::text)
      or has_role(auth.uid(), 'admin'::text)
      or public.is_approved_independent_educator(auth.uid())
      or exists (
        select 1 from public.platform_institution_members im
        where im.user_id = auth.uid()
          and im.status = 'active'
          and im.membership_role in ('teacher','tutor','administrator','staff')
      )
    )
  );

drop policy if exists "authors edit own unsubmitted tutorials" on public.teacher_tutorials;
create policy "authors edit own unsubmitted tutorials" on public.teacher_tutorials
  for update to authenticated using (
    author_id = auth.uid() and status in ('draft','changes_requested')
    and (
      has_role(auth.uid(), 'teacher'::text)
      or has_role(auth.uid(), 'admin'::text)
      or public.is_approved_independent_educator(auth.uid())
      or exists (
        select 1 from public.platform_institution_members im
        where im.user_id = auth.uid()
          and im.status = 'active'
          and im.membership_role in ('teacher','tutor','administrator','staff')
      )
    )
  ) with check (
    author_id = auth.uid() and status in ('draft','changes_requested','in_review')
    and published_at is null and published_by is null
  );

drop policy if exists "teachers upload media into own folder" on storage.objects;
create policy "educators upload media into own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'teacher-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      has_role(auth.uid(), 'teacher'::text)
      or has_role(auth.uid(), 'admin'::text)
      or public.is_approved_independent_educator(auth.uid())
      or exists (
        select 1 from public.platform_institution_members im
        where im.user_id = auth.uid()
          and im.status = 'active'
          and im.membership_role in ('teacher','tutor','administrator','staff')
      )
    )
  );

drop policy if exists "authors delete own teacher media" on storage.objects;
create policy "educators delete own teacher media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'teacher-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (
      has_role(auth.uid(), 'teacher'::text)
      or has_role(auth.uid(), 'admin'::text)
      or public.is_approved_independent_educator(auth.uid())
      or exists (
        select 1 from public.platform_institution_members im
        where im.user_id = auth.uid()
          and im.status = 'active'
          and im.membership_role in ('teacher','tutor','administrator','staff')
      )
    )
  );
